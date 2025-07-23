import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import "./checkoutForm.css";
import { useEffect, useState } from "react";
import { ClipLoader } from "react-spinners";
import useAxiosSecure from "../../hooks/useAxiosSecure";
import useAuth from "../../hooks/useAuth";
import toast from "react-hot-toast";

const CheckoutForm = ({ totalPrice, closeModal, orderData }) => {
  const { user } = useAuth();
  const axiosSecure = useAxiosSecure();
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  useEffect(() => {
    const getClientSecret = async () => {
      const { data } = await axiosSecure.post("/create-payment-intent", {
        quantity: orderData?.quantity,
        plantId: orderData.plantId,
      });
      setClientSecret(data?.clientSecret);
    };
    getClientSecret();
  }, [axiosSecure, orderData]);

  const handleSubmit = async (event) => {
    setProcessing(true);
    // Block native form submission.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }

    // Get a reference to a mounted CardElement. Elements knows how
    // to find your CardElement because there can only ever be one of
    // each type of element.
    const card = elements.getElement(CardElement);

    if (card == null) {
      return;
    }

    // Use your card Element with other Stripe.js APIs
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card,
    });

    if (error) {
      console.log("[error]", error);
      setCardError(error.message);
      setProcessing(false);
      return;
    } else {
      console.log("[PaymentMethod]", paymentMethod);
      setCardError(null);
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: {
          name: user?.displayName,
          email: user?.email,
        },
      },
    });
    if (result?.error) {
      setCardError(result?.error?.message);
      return;
    }
    if (result?.paymentIntent?.status === "succeeded") {
      // save order data in DB
      orderData.transactionId = result?.paymentIntent?.id;
      try {
        const { data } = await axiosSecure.post("/order", orderData);
        if (data?.insertedId) {
          toast.success("Order Placed Successfully");
        }
      } catch (err) {
        console.log(err);
      } finally {
        setProcessing(false);
        setCardError(null);
        closeModal();
      }
    }
    console.log(result);
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement
        options={{
          style: {
            base: {
              fontSize: "16px",
              color: "#424770",
              "::placeholder": {
                color: "#aab7c4",
              },
            },
            invalid: {
              color: "#9e2146",
            },
          },
        }}
      />
      {cardError && <p className="text-red-500 mb-5">{cardError}</p>}
      <div className="flex justify-baseline gap-5">
        <button
          className="mt-5 w-full rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600 transition duration-200 font-semibold"
          type="submit"
          disabled={!stripe || processing}
        >
          {processing ? (
            <ClipLoader size={24}></ClipLoader>
          ) : (
            `Pay ${totalPrice}$`
          )}
        </button>
        <button
          onClick={closeModal}
          className="mt-5 w-full rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600 transition duration-200 font-semibold"
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default CheckoutForm;
