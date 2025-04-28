import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

interface Review {
  id: string;
  reviewText: string;
  reviewerName: string;
  createdAt: any;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchReviews = async () => {
      const querySnapshot = await getDocs(collection(db, "reviews"));
      const reviewsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Review, "id">),
      }));
      setReviews(reviewsList);
      setLoading(false);
    };

    fetchReviews();
  }, []);

  const handleAddReview = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (newReview.trim() === "") {
      alert("Please enter a review before submitting.");
      return;
    }

    try {
      await addDoc(collection(db, "reviews"), {
        reviewText: newReview.trim(),
        reviewerName: user.displayName || "Anonymous",
        createdAt: serverTimestamp(),
      });
      alert("✅ Review submitted successfully!");

      setNewReview("");

      // Fetch reviews again after adding
      const querySnapshot = await getDocs(collection(db, "reviews"));
      const updatedReviews = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Review, "id">),
      }));
      setReviews(updatedReviews);
    } catch (error) {
      console.error("Error adding review:", error);
      alert("❌ Failed to submit review. Please try again.");
    }
  };

  return (
    <>
      <Head>
        <title>Reviews | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <h1 className="text-4xl font-bold text-teal-400 mb-10 text-center">
          What Our Clients Say
        </h1>

        {loading ? (
          <p className="text-center text-gray-400">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-center text-gray-400">
            No reviews yet. Be the first to leave a review!
          </p>
        ) : (
          <div className="grid gap-6 max-w-3xl mx-auto">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-500 hover:shadow-teal-400/30 transition"
              >
                <p className="text-lg text-gray-300 mb-4">
                  "{review.reviewText}"
                </p>
                <div className="text-sm text-teal-400 font-semibold text-right">
                  - {review.reviewerName}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Review Section */}
        <div className="max-w-3xl mx-auto mt-12">
          <h2 className="text-2xl text-teal-400 font-semibold mb-4">
            Add a Review
          </h2>
          <textarea
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            rows={4}
            placeholder="Write your honest review..."
            className="w-full bg-gray-800 p-4 rounded-lg border border-teal-600 text-white focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
          />
          <button
            onClick={handleAddReview}
            className="mt-4 bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition"
          >
            Submit Review
          </button>
        </div>
      </main>

      <Footer />
    </>
  );
}
