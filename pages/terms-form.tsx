// import { useRef, useState } from "react";
// import Head from "next/head";
// import Navbar from "@/components/Navbar";
// import Footer from "@/components/Footer";
// import emailjs from "emailjs-com";
// import SignatureCanvas from "react-signature-canvas";
// import jsPDF from "jspdf";

// export default function TermsForm() {
//   const formRef = useRef<HTMLFormElement>(null);
//   const sigCanvas = useRef<SignatureCanvas>(null);
//   const [submitted, setSubmitted] = useState(false);
//   const [formData, setFormData] = useState({ name: "", email: "" });

//   const clearSignature = () => sigCanvas.current?.clear();

//   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     if (sigCanvas.current?.isEmpty()) {
//       alert("Please draw your signature before submitting.");
//       return;
//     }

//     const canvas = sigCanvas.current?.getCanvas();
//     const signature = canvas?.toDataURL("image/png") || null;
//     const form = formRef.current;

//     if (!form || !signature) {
//       console.error("❌ Missing form or signature.");
//       return;
//     }

//     const fd = new FormData(form);
//     fd.append("signature", signature);

//     emailjs
//       .sendForm(
//         "service_4yl6voe",
//         "template_hjh29ya",
//         form,
//         "1EjxPg3_raS1xxgZ9"
//       )
//       .then(
//         () => {
//           alert("✅ Form submitted successfully!");
//           setFormData({
//             name: fd.get("name") as string,
//             email: fd.get("email") as string,
//           });
//           setSubmitted(true);
//           generatePDF(fd.get("name") as string, fd.get("email") as string, signature);
//           form.reset();
//           clearSignature();
//         },
//         (error) => {
//           alert("❌ Failed to send form. Please try again.");
//           console.error("❌ EmailJS error:", error);
//         }
//       );
//   };

//   const generatePDF = (name: string, email: string, signature: string | null) => {
//     const doc = new jsPDF();
//     doc.setFontSize(16);
//     doc.text("DevEngine - Terms & Conditions Agreement", 20, 20);

//     doc.setFontSize(12);
//     doc.text(`Name: ${name}`, 20, 40);
//     doc.text(`Email: ${email}`, 20, 50);
//     doc.text("I have agreed to the terms and conditions of DevEngine.", 20, 60);

//     if (signature) {
//       doc.addImage(signature, "PNG", 20, 70, 160, 40);
//     }

//     doc.save("devengine-terms-agreement.pdf");
//   };

//   return (
//     <>
//       <Head>
//         <title>Terms Agreement Form | DevEngine</title>
//       </Head>
//       <Navbar />
//       <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
//         <h1 className="text-3xl md:text-5xl font-bold mb-8 text-center text-teal-400">
//           Terms & Conditions Agreement Form
//         </h1>

//         {submitted ? (
//           <div className="text-center text-green-400 text-xl">
//             ✅ Form submitted successfully!
//             <br />
//             <button
//               className="mt-4 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
//               onClick={() =>
//                 generatePDF(
//                   formData.name,
//                   formData.email,
//                   sigCanvas.current?.getCanvas()?.toDataURL("image/png") || null
//                 )
//               }
//             >
//               📄 Download Form
//             </button>
//           </div>
//         ) : (
//           <form
//             ref={formRef}
//             onSubmit={handleSubmit}
//             className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-xl space-y-6 shadow-lg"
//           >
//             <input type="hidden" name="title" value="Terms Agreement Form" />

//             <div>
//               <label className="block mb-1 text-sm">Full Name</label>
//               <input
//                 type="text"
//                 name="name"
//                 required
//                 className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
//               />
//             </div>

//             <div>
//               <label className="block mb-1 text-sm">Email Address</label>
//               <input
//                 type="email"
//                 name="email"
//                 required
//                 className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-teal-400"
//               />
//             </div>

//             <div className="text-gray-300">
//               <input type="checkbox" required className="mr-2" />
//               I have read and agree to all the terms and conditions outlined by DevEngine.
//             </div>

//             <div>
//               <label className="block mb-1 text-sm mb-2">Digital Signature (Draw Below)</label>
//               <div className="bg-white rounded overflow-hidden shadow-md">
//                 <SignatureCanvas
//                   ref={sigCanvas}
//                   canvasProps={{
//                     width: 500,
//                     height: 150,
//                     className: "sigCanvas",
//                   }}
//                 />
//               </div>
//               <button
//                 type="button"
//                 onClick={clearSignature}
//                 className="mt-2 text-sm text-red-400 hover:underline"
//               >
//                 Clear Signature
//               </button>
//             </div>

//             <button
//               type="submit"
//               className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2 px-4 rounded transition"
//             >
//               Submit Agreement
//             </button>
//           </form>
//         )}
//       </main>
//       <Footer />
//     </>
//   );
// }
