import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

const AuthPopup = () => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop with strong blur and darkening */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md"></div>

      {/* Popup Content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-fade-in-up">
        <div className="mb-6">
          <img src={logo} alt="Surnivash Logo" className="w-24 mx-auto mb-4 drop-shadow-lg" />
          <h2 className="text-3xl font-serif font-bold mb-2">Exclusive Access</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Join our exclusive community to explore our premium diamond collections.
            Please sign in to continue.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            to="/auth"
            className="block w-full py-3.5 bg-black text-white rounded-full text-sm font-medium tracking-widest hover:bg-gray-800 transition-all uppercase shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Log In / Sign Up
          </Link>
          <Link
            to="/"
            className="block w-full py-3.5 text-gray-500 text-xs font-medium tracking-widest hover:text-black transition-colors uppercase"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPopup;
