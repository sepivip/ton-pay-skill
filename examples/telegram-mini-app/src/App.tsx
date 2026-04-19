import Checkout from "./checkout";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        backgroundColor: "var(--tg-theme-bg-color, #ffffff)",
        color: "var(--tg-theme-text-color, #000000)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <Checkout />
    </div>
  );
}
