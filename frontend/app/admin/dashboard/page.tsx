"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

type Tab = "stations" | "transactions";

interface Station {
  id: string;
  name: string;
  status: string;
  connectorType: string;
  pricePerKwh: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  stripePaymentId: string;
  stationId: string;
  station: {
    id: string;
    name: string;
  };
  amount: number;
  energyKwh: number;
  startTime: string;
  endTime: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddStationModal({ isOpen, onClose, onSuccess }: AddStationModalProps) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    connectorType: "",
    pricePerKwh: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: {
        name: string;
        connectorType: string;
        pricePerKwh: number;
        id?: string;
      } = {
        name: formData.name,
        connectorType: formData.connectorType,
        pricePerKwh: parseFloat(formData.pricePerKwh),
      };

      // Jeśli ID zostało podane, dodaj je do payloadu
      if (formData.id.trim()) {
        payload.id = formData.id.trim();
      }

      await axios.post(`${API_URL}/admin/stations`, payload);

      // Reset form
      setFormData({
        id: "",
        name: "",
        connectorType: "",
        pricePerKwh: "",
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error creating station:", err);
      setError(
        err.response?.data?.message ||
          "Nie udało się dodać stacji. Spróbuj ponownie."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Dodaj Stację</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="id"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              ID Stacji (opcjonalne - zostanie wygenerowane UUID jeśli puste)
            </label>
            <input
              type="text"
              id="id"
              value={formData.id}
              onChange={(e) =>
                setFormData({ ...formData, id: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="np. CP_002"
            />
          </div>

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nazwa *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="np. Stacja Warszawa Centrum"
            />
          </div>

          <div>
            <label
              htmlFor="connectorType"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Typ Złącza *
            </label>
            <input
              type="text"
              id="connectorType"
              required
              value={formData.connectorType}
              onChange={(e) =>
                setFormData({ ...formData, connectorType: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="np. Type 2, CCS, CHAdeMO"
            />
          </div>

          <div>
            <label
              htmlFor="pricePerKwh"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Cena za kWh (zł) *
            </label>
            <input
              type="number"
              id="pricePerKwh"
              required
              step="0.01"
              min="0.01"
              value={formData.pricePerKwh}
              onChange={(e) =>
                setFormData({ ...formData, pricePerKwh: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="np. 2.50"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-green-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-green-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Dodawanie..." : "Dodaj Stację"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("stations");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [showAddStationModal, setShowAddStationModal] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  useEffect(() => {
    // Sprawdź autentykację
    const auth = localStorage.getItem("admin_authenticated");
    if (auth !== "true") {
      router.push("/admin");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "stations") {
      fetchStations();
      
      // Odświeżaj status stacji co 3 sekundy dla real-time updates
      const interval = setInterval(() => {
        fetchStations();
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "transactions") {
      fetchTransactions();
    }
  }, [isAuthenticated, activeTab]);

  const fetchStations = async () => {
    setIsLoadingStations(true);
    try {
      const response = await axios.get(`${API_URL}/admin/stations`);
      setStations(response.data);
    } catch (error) {
      console.error("Error fetching stations:", error);
      alert("Nie udało się pobrać listy stacji");
    } finally {
      setIsLoadingStations(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const response = await axios.get(`${API_URL}/admin/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      alert("Nie udało się pobrać listy transakcji");
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    router.push("/admin");
  };

  const downloadQRCode = async (stationId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://twoja-domena.app";
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return "W trakcie";
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      AVAILABLE: "Dostępna",
      CHARGING: "Zajęta",
      OCCUPIED: "Zajęta",
      UNAVAILABLE: "Niedostępna",
      PENDING: "Oczekuje",
      COMPLETED: "Zakończona",
      FAILED: "Nieudana",
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    if (status === "AVAILABLE") {
      return "bg-green-100 text-green-800";
    } else if (status === "CHARGING" || status === "OCCUPIED" || status === "PENDING") {
      return "bg-yellow-100 text-yellow-800";
    } else if (status === "UNAVAILABLE" || status === "FAILED") {
      return "bg-red-100 text-red-800";
    } else if (status === "COMPLETED") {
      return "bg-blue-100 text-blue-800";
    }
    return "bg-gray-100 text-gray-800";
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Stacje</h2>
              <button
                onClick={() => setShowAddStationModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-green-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-green-600 transition-all shadow-sm hover:shadow-md"
              >
                + Dodaj Stację
              </button>
            </div>

            {isLoadingStations ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                <p className="mt-4 text-gray-600">Ładowanie stacji...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {stations.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p>Brak stacji w bazie danych.</p>
                    <p className="mt-2">Kliknij "Dodaj Stację", aby dodać pierwszą stację.</p>
                  </div>
                ) : (
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
                          Typ Złącza
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Cena (zł/kWh)
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {station.connectorType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {station.pricePerKwh.toFixed(2)} zł
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                station.status
                              )}`}
                            >
                              {getStatusLabel(station.status)}
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
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "transactions" && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Transakcje</h2>

            {isLoadingTransactions ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                <p className="mt-4 text-gray-600">Ładowanie transakcji...</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {transactions.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <p>Brak transakcji w bazie danych.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          ID Stripe
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Stacja
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Kwota
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Energia (kWh)
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
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
                            {transaction.stripePaymentId.substring(0, 20)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {transaction.station.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {transaction.amount.toFixed(2)} zł
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {transaction.energyKwh.toFixed(2)} kWh
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                                transaction.status
                              )}`}
                            >
                              {getStatusLabel(transaction.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatDate(transaction.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <AddStationModal
        isOpen={showAddStationModal}
        onClose={() => setShowAddStationModal(false)}
        onSuccess={fetchStations}
      />
    </div>
  );
}
