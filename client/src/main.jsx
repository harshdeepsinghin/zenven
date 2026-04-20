import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#fff8eb",
            color: "#112218",
            border: "1px solid rgba(17, 34, 24, 0.12)"
          }
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
