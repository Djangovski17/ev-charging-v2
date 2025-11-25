"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Tab = "stations" | "transactions";

interface Station {
  id: string;
  name: string;
  status: "available" | "occupied";
}

interface Transaction {
  id: string;
  amount: number;
  energy: number;
  duration: string;
  date: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("stations");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Mock data dla stacji
  const [stations] = useState<Station[]>([
    { id: "ST001", name: "Stacja Warszawa Centrum", status: "available" },
    { id: "ST002", name: "Stacja Kraków Główny", status: "occupied" },
    { id: "ST003", name: "Stacja Gdańsk Port", status: "available" },
    { id: "ST004", name: "Stacja Wrocław Rynek", status: "available" },
    { id: "ST005", name: "Stacja Poznań Stare Miasto", status: "occupied" },
  ]);

  // Mock data dla transakcji
  const [transactions] = useState<Transaction[]>([
    { id: "TXN001", amount: 150, energy: 45.2, duration: "1h 23m", date: "2024-01-15 14:30" },
    { id: "TXN002", amount: 200, energy: 58.5, duration: "1h 45m", date: "2024-01-15 12:15" },
    { id: "TXN003", amount: 100, energy: 32.1, duration: "0h 58m", date: "2024-01-15 10:00" },
    { id: "TXN004", amount: 300, energy: 89.3, duration: "2h 15m", date: "2024-01-14 18:45" },
    { id: "TXN005", amount: 175, energy: 52.7, duration: "1h 32m", date: "2024-01-14 16:20" },
    { id: "TXN006", amount: 250, energy: 74.8, duration: "1h 58m", date: "2024-01-14 14:10" },
  ]);

  useEffect(() => {
    // Sprawdź autentykację
    const auth = localStorage.getItem("admin_authenticated");
    if (auth !== "true") {
      router.push("/admin");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    router.push("/admin");
  };

  const downloadQRCode = async (stationId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://twoja-domena.com";
    const qrUrl = `${baseUrl}/?station=${stationId}`;
    
    try {
      // Dynamiczny import biblioteki qrcode
      const QRCode = await import("qrcode");
      
      // Utwórz canvas i wygeneruj QR code
      const canvas = document.createElement("canvas");
      await QRCode.default.toCanvas(canvas, qrUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Pobierz canvas jako PNG
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `qr-${stationId}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch (error) {
      console.error("Error generating QR code:", error);
      alert("Wystąpił błąd podczas generowania kodu QR");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">PlugBox</h1>
          <p className="text-sm text-gray-600 mt-1">Panel Administratora</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab("stations")}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
              activeTab === "stations"
                ? "bg-gradient-to-r from-cyan-500 to-green-500 text-white shadow-md"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="font-medium">Stacje</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("transactions")}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
              activeTab === "transactions"
                ? "bg-gradient-to-r from-cyan-500 to-green-500 text-white shadow-md"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="font-medium">Transakcje</span>
            </div>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Wyloguj</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {activeTab === "stations" && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Stacje</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ID Stacji
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Nazwa
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Akcje
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stations.map((station) => (
                    <tr key={station.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {station.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {station.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            station.status === "available"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {station.status === "available" ? "Dostępna" : "Zajęta"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => downloadQRCode(station.id)}
                          className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-green-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-green-600 transition-all shadow-sm hover:shadow-md"
                        >
                          Pobierz QR
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Transakcje</h2>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Kwota
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Energia (kWh)
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Czas
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {transaction.amount} zł
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {transaction.energy} kWh
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {transaction.duration}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {transaction.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

