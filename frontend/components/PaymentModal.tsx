"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import axios from "axios";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  stationId: string;
  onSuccess: () => void;
}

function CheckoutForm({
  amount,
  stationId,
  onSuccess,
  onClose,
}: {
  amount: number;
  stationId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Wystąpił błąd podczas płatności");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        // Wyślij request do endpointu startu
        try {
          const response = await axios.get(
            `http://localhost:3000/start/${stationId}`
          );
          if (response.data.success) {
            onSuccess();
          } else {
            setErrorMessage(
              response.data.message || "Nie udało się rozpocząć ładowania"
            );
            setIsProcessing(false);
          }
        } catch (error) {
          console.error("Error starting charging:", error);
          setErrorMessage("Płatność zakończona, ale nie udało się rozpocząć ładowania");
          setIsProcessing(false);
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      setErrorMessage("Wystąpił błąd podczas przetwarzania płatności");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {errorMessage && (
        <div className="text-red-600 text-sm mt-2">{errorMessage}</div>
      )}
      <div className="flex gap-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-green-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {isProcessing ? "Przetwarzanie..." : `Zapłać ${amount} zł`}
        </button>
      </div>
    </form>
  );
}

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  stationId,
  onSuccess,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !clientSecret) {
      setIsLoading(true);
      setError(null);

      axios
        .post("http://localhost:3000/create-payment-intent", {
          amount: amount * 100, // Stripe używa groszy
          stationId: stationId,
        })
        .then((response) => {
          setClientSecret(response.data.clientSecret);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Error creating payment intent:", err);
          setError(
            err.response?.data?.message ||
              "Nie udało się utworzyć płatności. Spróbuj ponownie."
          );
          setIsLoading(false);
        });
    } else if (!isOpen) {
      // Resetuj stan gdy modal jest zamknięty
      setClientSecret(null);
      setError(null);
    }
  }, [isOpen, amount, clientSecret]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Płatność</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            <p className="mt-4 text-gray-600">Przygotowywanie płatności...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Zamknij
            </button>
          </div>
        )}

        {clientSecret && !isLoading && !error && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
              },
            }}
          >
            <CheckoutForm
              amount={amount}
              stationId={stationId}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}

