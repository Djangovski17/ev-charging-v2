"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import PaymentModal from "../components/PaymentModal";

type ViewState = "idle" | "payment" | "charging";

function HomeContent() {
  const searchParams = useSearchParams();
  const stationId = searchParams.get("station");
  const [amount, setAmount] = useState(100);
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [energyKwh, setEnergyKwh] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  
  const PRICE_PER_KWH = 2.50;

  useEffect(() => {
    if (sliderRef.current) {
      const progress = ((amount - 20) / (500 - 20)) * 100;
      const bgColor = "#e5e7eb";
      sliderRef.current.style.background = `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${progress}%, ${bgColor} ${progress}%, ${bgColor} 100%)`;
    }
  }, [amount]);

  // Socket.io connection when entering charging state
  useEffect(() => {
    if (viewState === "charging" && stationId) {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      console.log(`[Frontend] Łączenie z Socket.io server: ${backendUrl}, stationId: ${stationId}`);
      const newSocket = io(backendUrl, {
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log(`[Frontend] Połączono z Socket.io server (socket.id: ${newSocket.id})`);
      });

      newSocket.on("connect_error", (error) => {
        console.error("[Frontend] Błąd połączenia Socket.io:", error);
      });

      newSocket.on("energy_update", (data: { stationId: string; energy: number | null; power: number | null }) => {
        console.log("[Frontend] Otrzymano zdarzenie energy_update:", data);
        console.log(`[Frontend] Porównywanie stationId: oczekiwane="${stationId}", otrzymane="${data.stationId}", match=${data.stationId === stationId}`);
        
        if (data.stationId === stationId && data.energy !== null) {
          // Konwersja z Wh na kWh
          const newEnergyKwh = data.energy / 1000;
          console.log(`[Frontend] Aktualizuję licznik energii: ${newEnergyKwh} kWh (z ${data.energy} Wh)`);
          setEnergyKwh(newEnergyKwh);
        } else {
          console.log(`[Frontend] Ignoruję zdarzenie: stationId nie pasuje lub energy jest null`);
        }
      });

      newSocket.on("disconnect", (reason) => {
        console.log(`[Frontend] Rozłączono z Socket.io server. Powód: ${reason}`);
      });

      setSocket(newSocket);

      return () => {
        console.log("[Frontend] Zamykanie połączenia Socket.io");
        newSocket.disconnect();
        setSocket(null);
      };
    } else if (viewState !== "charging" && socket) {
      // Rozłącz gdy opuszczamy widok ładowania
      console.log("[Frontend] Opuszczono widok ładowania - rozłączam Socket.io");
      socket.disconnect();
      setSocket(null);
    }
  }, [viewState, stationId]);

  // Timer dla czasu trwania sesji
  useEffect(() => {
    if (viewState === "charging" && sessionStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setSessionDuration(diff);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [viewState, sessionStartTime]);

  // Formatowanie czasu (MM:SS)
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Obsługa zakończenia ładowania
  const handleStopCharging = async () => {
    if (!stationId || isStopping) return;

    setIsStopping(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      const response = await axios.get(`${backendUrl}/stop/${stationId}`);
      
      if (response.data.success) {
        // Rozłącz Socket.io
        if (socket) {
          socket.disconnect();
          setSocket(null);
        }
        // Wróć do widoku idle
        setViewState("idle");
        setEnergyKwh(0);
        setSessionStartTime(null);
        setSessionDuration(0);
      } else {
        alert(response.data.message || "Nie udało się zakończyć ładowania");
      }
    } catch (error) {
      console.error("Error stopping charging:", error);
      alert("Wystąpił błąd podczas zakończenia ładowania");
    } finally {
      setIsStopping(false);
    }
  };

  // Widok ładowania
  if (viewState === "charging") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-zinc-900 flex flex-col">
        {/* Header */}
        <header className="w-full py-6 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-wide">PlugBox</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-8">
          {/* Animacja ładowania */}
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-cyan-400 to-green-400 rounded-full animate-pulse shadow-2xl shadow-cyan-500/50 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-cyan-400 to-green-400 rounded-full animate-ping opacity-20"></div>
          </div>

          {/* Licznik energii */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600 uppercase tracking-wide">Pobrana energia</p>
            <p className="text-7xl font-bold bg-gradient-to-r from-cyan-500 to-green-500 bg-clip-text text-transparent">
              {energyKwh.toFixed(2)}
            </p>
            <p className="text-2xl font-semibold text-gray-700">kWh</p>
          </div>

          {/* Koszt */}
          <div className="text-center space-y-2">
            <p className="text-7xl font-bold bg-gradient-to-r from-cyan-500 to-green-500 bg-clip-text text-transparent">
              {(energyKwh * PRICE_PER_KWH).toFixed(2)} PLN
            </p>
          </div>

          {/* Czas trwania sesji */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600 uppercase tracking-wide">Czas trwania</p>
            <p className="text-4xl font-bold text-gray-800 font-mono">
              {formatDuration(sessionDuration)}
            </p>
          </div>

          {/* Przycisk zakończenia */}
          <button
            onClick={handleStopCharging}
            disabled={isStopping}
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStopping ? "ZAKOŃCZANIE..." : "ZAKOŃCZ ŁADOWANIE"}
          </button>

          {/* Informacja o stacji */}
          <p className="text-sm text-gray-500">Stacja: {stationId}</p>
        </main>

        {/* Footer */}
        <footer className="w-full py-6 px-4 text-center">
          <p className="text-sm text-gray-500">Powered by Stripe & OCPP</p>
        </footer>
      </div>
    );
  }

  // Komunikat gdy brak parametru station
  if (!stationId) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
        <header className="w-full py-8 px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-wide">PlugBox</h1>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <p className="text-2xl font-medium text-gray-600 text-center">
            Zeskanuj kod QR na stacji
          </p>
        </main>
        <footer className="w-full py-6 px-4 text-center">
          <p className="text-sm text-gray-500">Powered by Stripe & OCPP</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col">
      {/* Header */}
      <header className="w-full py-8 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-wide">PlugBox</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 space-y-12">
        {/* Status Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
            <div className="absolute inset-0 w-6 h-6 bg-green-500 rounded-full animate-ping opacity-75"></div>
          </div>
          <p className="text-xl font-medium text-gray-600">Gotowy do ładowania</p>
        </div>

        {/* Amount Selection Section */}
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-6xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
              {amount} zł
            </p>
            <p className="text-sm text-gray-500">Wybierz kwotę</p>
          </div>

          {/* Range Slider */}
          <div className="px-2">
            <input
              ref={sliderRef}
              type="range"
              min="20"
              max="500"
              step="5"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <style jsx>{`
              .slider::-webkit-slider-thumb {
                appearance: none;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #06b6d4;
                cursor: pointer;
                box-shadow: 0 0 10px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3);
              }
              .slider::-moz-range-thumb {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: #06b6d4;
                cursor: pointer;
                border: none;
                box-shadow: 0 0 10px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3);
              }
            `}</style>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>20 zł</span>
              <span>500 zł</span>
            </div>
          </div>
        </div>

        {/* Action Button - Circular with Lightning Icon */}
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={() => setViewState("payment")}
            className="w-32 h-32 rounded-full bg-gradient-to-r from-cyan-500 to-green-500 text-black shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
          >
            <svg
              className="w-12 h-12"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M13 1L3 14h8l-2 9 10-13h-8l2-9z" />
            </svg>
          </button>
          <p className="text-lg font-semibold text-gray-700">ZAPŁAĆ I ŁADUJ</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-4 text-center">
        <p className="text-sm text-gray-500">Powered by Stripe & OCPP</p>
      </footer>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={viewState === "payment"}
        onClose={() => setViewState("idle")}
        amount={amount}
        stationId={stationId}
        onSuccess={() => {
          setViewState("charging");
          setSessionStartTime(new Date());
          setEnergyKwh(0);
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
