import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Willy Shawarma & Grills" },
      { name: "description", content: "Order Lagos's hottest shawarma direct, zero middleman fees." },
    ],
  }),
  component: WillyBot,
});

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const BANK = { bankName: "Zenith Bank", accountName: "Willy Shawarma & Grills Ltd", accountNumber: "2109876543" };
const DELIVERY_FEE = 5000;
const SUGGESTED_SIDE = { name: "Crispy French Fries", price: 1500, emoji: "🍟" };

const HUBS = [
  { id: 1, label: "Alimosho", full: "Alimosho Bustop (Iyana Ipaja)" },
  { id: 2, label: "Dopemu", full: "Dopemu (Old Road)" },
  { id: 3, label: "Akesan", full: "Akesan Bustop (Igando)" },
  { id: 4, label: "Lasu-Isheri", full: "Lasu-Isheri Road Hub" },
  { id: 5, label: "Meiran", full: "Meiran Road Hub" },
  { id: 6, label: "Badagry", full: "Badagry Express Hub" },
];

type MenuItem = { name: string; price: number; emoji: string };

type MenuCategory = { category: string; items: MenuItem[] };

const MENU_CATEGORIES: MenuCategory[] = [
  {
    category: "🥙 Mixed Shawarma (Chicken & Beef)",
    items: [
      { name: "Willy Special (Extra Beef + Chicken + 2 Sausages)", price: 6100, emoji: "👑" },
      { name: "Mixed Combo (Double Sausage)", price: 5000, emoji: "🌭" },
      { name: "Mixed Combo (Single Sausage)", price: 4450, emoji: "🌯" },
      { name: "Mixed Combo (No Sausage - Extra Meat)", price: 4450, emoji: "🥩" },
    ],
  },
  {
    category: "🐔 Chicken Shawarma",
    items: [
      { name: "Chicken Shawarma (Double Sausage)", price: 3900, emoji: "🌭" },
      { name: "Chicken Shawarma (Single Sausage)", price: 3350, emoji: "🌯" },
      { name: "Chicken Shawarma (No Sausage - Extra Chicken)", price: 3900, emoji: "🍗" },
    ],
  },
  {
    category: "🥩 Beef Shawarma",
    items: [
      { name: "Beef Shawarma (Double Sausage)", price: 4450, emoji: "🌭" },
      { name: "Beef Shawarma (Single Sausage)", price: 3900, emoji: "🌯" },
      { name: "Beef Shawarma (No Sausage - Extra Flavour Beef)", price: 3900, emoji: "🥩" },
    ],
  },
  {
    category: "🌶️ Specialty Wraps",
    items: [
      { name: "Suya Special Shawarma (Native Suya + Sausage)", price: 6100, emoji: "🔥" },
    ],
  },
  {
    category: "🐟 Fish & BBQ Platters",
    items: [
      { name: "Special BBQ Catfish (Large) - pepper sauce, chips, salad", price: 13750, emoji: "🐟" },
      { name: "Special BBQ Catfish (Medium) - pepper sauce, chips, salad", price: 11750, emoji: "🐟" },
      { name: "Croaker Fish BBQ (Large) - pepper sauce, ketchup, chips, salad", price: 13750, emoji: "🐠" },
      { name: "Croaker Fish BBQ (Medium) - chips + signature dip", price: 11750, emoji: "🐠" },
      { name: "Croaker Fish BBQ (Small) - fries + special dip", price: 11750, emoji: "🐠" },
      { name: "Grilled BBQ Chicken (Large) - free chips + pepper sauce", price: 8800, emoji: "🍗" },
      { name: "Grilled BBQ Chicken (Medium) - extra chips + side sauce", price: 6600, emoji: "🍗" },
    ],
  },
];

const MENU_ITEMS: MenuItem[] = MENU_CATEGORIES.flatMap((c) => c.items);

const EXTRA_SIDES: MenuItem[] = [
  { name: "Crispy French Fries", price: 1500, emoji: "🍟" },
  { name: "Signature Spicy Pepper Sauce", price: 500, emoji: "🌶️" },
  { name: "Fresh Side Salad", price: 800, emoji: "🥗" },
  { name: "Ketchup Pack", price: 200, emoji: "🍅" },
];

const PHASE = {
  HOME: "home",
  VIEW_MENU: "view_menu",
  FAQS: "faqs",
  LOCATION: "location",
  MENU: "menu",
  SUGGEST: "suggest",
  PAYMENT: "payment",
  RECEIPT: "receipt",
  FULFILLMENT: "fulfillment",
  ADDRESS: "address",
  DELIVERY_CHOICE: "delivery_choice",
  DELIVERY_RECEIPT: "delivery_receipt",
  TRACKING: "tracking",
  PICKUP_DONE: "pickup_done",
} as const;

type Phase = (typeof PHASE)[keyof typeof PHASE];

const fmt = () => new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 9);
const randCode = (len = 6) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};
const genOrderRef = () => `WS-${randCode(6)}`;
const genTrackingCode = () => `TRACK-${randCode(6)}`;

// ─────────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────────
const STEPS = ["Order", "Payment", "Fulfillment", "Delivered"];

function phaseToStep(phase: Phase) {
  if (([PHASE.HOME, PHASE.VIEW_MENU, PHASE.FAQS] as Phase[]).includes(phase)) return -1;
  if (([PHASE.LOCATION, PHASE.MENU, PHASE.SUGGEST] as Phase[]).includes(phase)) return 0;
  if (([PHASE.PAYMENT, PHASE.RECEIPT] as Phase[]).includes(phase)) return 1;
  if (([PHASE.FULFILLMENT, PHASE.ADDRESS, PHASE.DELIVERY_CHOICE, PHASE.DELIVERY_RECEIPT] as Phase[]).includes(phase)) return 2;
  return 3;
}

function ProgressBar({ phase }: { phase: Phase }) {
  const active = phaseToStep(phase);
  return (
    <div
      style={{
        background: "#f0f2f5",
        borderBottom: "1px solid #e0e5e8",
        padding: "7px 14px 5px",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                background: i < active ? "#008069" : i === active ? "#00a884" : "#c8d0d5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: i === active ? "0 0 0 3px rgba(0,168,132,0.25)" : "none",
                transition: "all 0.35s ease",
              }}
            >
              {i < active ? "✓" : i + 1}
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: i <= active ? 700 : 400,
                color: i <= active ? "#008069" : "#aebac1",
                whiteSpace: "nowrap",
              }}
            >
              {s}
            </div>
          </div>
          {i < STEPS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                margin: "0 3px 14px",
                background: i < active ? "#008069" : "#d1d7db",
                transition: "background 0.35s ease",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// RIDER TRACKER
// ─────────────────────────────────────────────────────────────────
function RiderTracker({ trackingCode }: { trackingCode: string }) {
  const [eta, setEta] = useState(32);
  const [expanded, setExpanded] = useState(false);
  const [checklistStep, setChecklistStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setEta((p) => Math.max(1, p - 1)), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!expanded || checklistStep >= 2) return;
    const t = setTimeout(() => setChecklistStep((p) => p + 1), 2000);
    return () => clearTimeout(t);
  }, [expanded, checklistStep]);

  const checklist = [
    { label: "Food Preparing", icon: "🍳" },
    { label: "Handed to Rider", icon: "🤝" },
    { label: "Rider En Route", icon: "🛵" },
  ];

  return (
    <div style={{ alignSelf: "flex-start", maxWidth: "88%", animation: "popIn 0.3s ease" }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid #e9edef",
          borderRadius: "0 12px 12px 12px",
          overflow: "hidden",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            height: 120,
            background: "linear-gradient(140deg,#e8f5e9,#f1f8e9,#e3f2fd)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 300 120">
            <rect x="0" y="52" width="300" height="16" fill="#cfd8dc" opacity="0.6" />
            <rect x="135" y="0" width="16" height="120" fill="#cfd8dc" opacity="0.5" />
            <line x1="0" y1="60" x2="300" y2="60" stroke="white" strokeWidth="1.5" strokeDasharray="16,12" />
            <path d="M75 75 Q140 30 235 42" stroke="#00a884" strokeWidth="2" strokeDasharray="7,5" fill="none" opacity="0.8" />
            <circle cx="75" cy="75" r="9" fill="#FF5722" opacity="0.9" />
            <circle cx="75" cy="75" r="15" fill="#FF5722" opacity="0.15" />
            <text x="68" y="79" fontSize="9" fill="#fff" fontWeight="bold">🛵</text>
            <circle cx="235" cy="42" r="9" fill="#008069" />
            <circle cx="235" cy="42" r="16" fill="#008069" opacity="0.15" />
            <text x="228" y="46" fontSize="9" fill="#fff">📍</text>
          </svg>
          <div
            style={{
              position: "absolute",
              top: 7,
              left: 9,
              background: "rgba(255,255,255,0.92)",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 10,
              color: "#008069",
              fontWeight: 700,
              border: "1px solid #c8e6c9",
            }}
          >
            LIVE TRACKING
          </div>
          <div
            style={{
              position: "absolute",
              top: 7,
              right: 9,
              background: "rgba(0,168,132,0.9)",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 10,
              color: "#fff",
              fontWeight: 700,
              animation: "pulse 2s infinite",
            }}
          >
            ● LIVE
          </div>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: "#667781" }}>Tracking Code</div>
              <div style={{ fontSize: 13, color: "#111b21", fontWeight: 700, fontFamily: "monospace" }}>{trackingCode}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#667781" }}>Est. Arrival</div>
              <div style={{ fontSize: 18, color: "#008069", fontWeight: 800 }}>{eta} min</div>
            </div>
          </div>
          {expanded && (
            <div style={{ marginBottom: 10, borderRadius: 8, overflow: "hidden", border: "1px solid #e9edef" }}>
              {checklist.map((item, i) => {
                const done = i <= checklistStep;
                const active = i === checklistStep;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      background: done ? "#f0faf8" : "#fafafa",
                      borderBottom: i < 2 ? "1px solid #e9edef" : "none",
                      transition: "background 0.4s",
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: done ? "#00a884" : "#d1d7db",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        flexShrink: 0,
                        transition: "all 0.4s",
                        boxShadow: active ? "0 0 0 3px rgba(0,168,132,0.2)" : "none",
                        color: "#fff",
                      }}
                    >
                      {done ? "✓" : <span style={{ color: "#667781", fontSize: 10 }}>{i + 1}</span>}
                    </div>
                    <span style={{ fontSize: 12, color: done ? "#008069" : "#aebac1", fontWeight: done ? 700 : 400 }}>
                      {item.icon} {item.label}
                    </span>
                    {active && (
                      <div
                        style={{
                          marginLeft: "auto",
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#00a884",
                          animation: "pulse 1s infinite",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={() => {
              setExpanded((p) => !p);
              if (!expanded) setChecklistStep(0);
            }}
            style={{
              width: "100%",
              background: "#008069",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              padding: "9px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {expanded ? "▲ Hide Progress" : "📍 Track My Rider"}
          </button>
        </div>
      </div>
      <div style={{ fontSize: 10, color: "#667781", marginTop: 3, paddingLeft: 4 }}>{fmt()}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BACK BUTTON ROW
// ─────────────────────────────────────────────────────────────────
function BackRow({ onBack, label = "⬅️ Back to Main Menu" }: { onBack: () => void; label?: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e9edef",
        borderRadius: "0 0 12px 12px",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      <button className="wa-btn-full" style={{ color: "#667781", fontWeight: 600, fontSize: 13 }} onClick={onBack}>
        {label}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// QUICK REPLY BUTTON
// ─────────────────────────────────────────────────────────────────
function QuickButton({
  onClick,
  children,
  primary,
}: {
  onClick: () => void;
  children: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="wa-btn-full"
      style={{
        color: primary ? "#fff" : "#008069",
        background: primary ? "#008069" : "#fff",
        fontWeight: 700,
        fontSize: 13.5,
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────────────────────────
function formatText(text: string) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith("*") && p.endsWith("*") ? <strong key={i}>{p.slice(1, -1)}</strong> : <span key={i}>{p}</span>,
  );
}

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  type?: string;
  time: string;
  imgSrc?: string;
  extra?: Record<string, unknown>;
};

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (msg.type === "receipt-image") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "75%", animation: "popIn 0.25s ease" }}>
        <div
          style={{
            background: "#d9fdd3",
            borderRadius: "12px 0 12px 12px",
            padding: 4,
            boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
          }}
        >
          <img
            src={msg.imgSrc || "/placeholder.svg"}
            alt="Payment receipt"
            style={{ width: "100%", borderRadius: 8, display: "block", maxHeight: 220, objectFit: "cover" }}
          />
        </div>
        <div style={{ fontSize: 10, color: "#667781", marginTop: 3, textAlign: "right", paddingRight: 4 }}>{msg.time}</div>
      </div>
    );
  }

  return (
    <div style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "82%", animation: "popIn 0.22s ease" }}>
      <div
        style={{
          background: isUser ? "#d9fdd3" : "#fff",
          color: "#111b21",
          borderRadius: isUser ? "12px 0 12px 12px" : "0 12px 12px 12px",
          padding: "8px 11px",
          fontSize: 14,
          lineHeight: 1.45,
          boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {formatText(msg.text)}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#667781",
          marginTop: 3,
          textAlign: isUser ? "right" : "left",
          padding: isUser ? "0 4px 0 0" : "0 0 0 4px",
        }}
      >
        {msg.time}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div style={{ alignSelf: "flex-start", animation: "popIn 0.2s ease" }}>
      <div
        style={{
          background: "#fff",
          borderRadius: "0 12px 12px 12px",
          padding: "11px 14px",
          display: "flex",
          gap: 4,
          boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#9aa6ac",
              animation: `bounce 1.2s infinite ${i * 0.18}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
function WillyBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>(PHASE.HOME);
  const [selectedHub, setSelectedHub] = useState<(typeof HUBS)[number] | null>(null);
  const [cart, setCart] = useState<MenuItem[]>([]);
  const [orderRef, setOrderRef] = useState<string>("");
  const [deliveryRef, setDeliveryRef] = useState<string>("");
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, verifying, verified, aiLoading]);

  const subtotal = cart.reduce((sum, it) => sum + it.price, 0);

  const pushBot = useCallback((text: string, type = "text", extra: Partial<Message> = {}) => {
    setMessages((prev) => [...prev, { id: uid(), role: "bot", text, type, time: fmt(), ...extra }]);
  }, []);

  const pushUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: uid(), role: "user", text, time: fmt() }]);
  }, []);

  const copyField = (val: string, field: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const goHome = useCallback(() => {
    setPhase(PHASE.HOME);
    setCart([]);
    setOrderRef("");
    setDeliveryRef("");
    setTrackingCode("");
    setTimeout(
      () =>
        pushBot(
          "Welcome to Willy Shawarma & Grills! 🌟 Nigeria's hottest shawarma and grills, ordering direct with zero middleman fees. How can we serve you today?",
          "home",
        ),
      350,
    );
  }, [pushBot]);

  const goToLocation = useCallback(() => {
    setPhase(PHASE.LOCATION);
    setTimeout(
      () => pushBot("No dulling! 🔥 Please tap your nearest hub below and we'll load up the freshest menu for you!", "location"),
      350,
    );
  }, [pushBot]);

  const aiChat = useCallback(
    async (userText: string) => {
      setAiLoading(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userText }),
        });
        const data = await res.json();
        pushBot((data.text || "Omo I no hear you well, abeg try again! 😄").trim(), "text");
      } catch {
        pushBot("Ha! Network dey do me somehow 😅 Try again in a sec!", "text");
      }
      setAiLoading(false);
    },
    [pushBot],
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setTimeout(
      () =>
        pushBot(
          "Welcome to Willy Shawarma & Grills! 🌟 Nigeria's hottest shawarma and grills, ordering direct with zero middleman fees. How can we serve you today?",
          "home",
        ),
      600,
    );
  }, [pushBot]);

  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const runVerification = useCallback(
    (mode: "food" | "delivery") => {
      setVerifying(true);
      setTimeout(() => {
        setVerifying(false);
        setVerified(true);
        setTimeout(() => {
          setVerified(false);
          if (mode === "food") {
            setPhase(PHASE.FULFILLMENT);
            pushBot(
              "Payment Verified Successfully ✅ Omo! Your transfer has been confirmed. Now, how do you want your order — fresh to your door or you're coming to pick up yourself? 🌯",
              "fulfillment",
            );
          } else {
            const code = genTrackingCode();
            setTrackingCode(code);
            setPhase(PHASE.TRACKING);
            pushBot(
              `Delivery payment confirmed! ✅\n\n🎉 *Rider dispatched!*\nYour Delivery Tracking Code is *${code}*. Save it — you'll use it to track your meal all the way to your door. E go sweet! 🔥`,
              "text",
            );
            setTimeout(() => pushBot("", "tracker"), 1100);
          }
        }, 1200);
      }, 1500);
    },
    [pushBot],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMessages((prev) => [...prev, { id: uid(), role: "user", text: "", type: "receipt-image", imgSrc: url, time: fmt() }]);
    runVerification(phase === PHASE.DELIVERY_RECEIPT ? "delivery" : "food");
  };

  // ── order actions ─────────────────────────────────────────────
  const selectHub = (hub: (typeof HUBS)[number]) => {
    setSelectedHub(hub);
    pushUser(hub.label);
    setPhase(PHASE.MENU);
    setTimeout(
      () => pushBot(`${hub.full} kitchen is 🔥 online! Here's what's hot today — tap any item to add it to your basket:`, "menu"),
      400,
    );
  };

  // FIX #1: only the selected item is added; sides are suggested via interactive buttons.
  const selectMenuItem = (item: MenuItem) => {
    pushUser(item.name);
    setCart([item]);
    setPhase(PHASE.SUGGEST);
    setTimeout(
      () =>
        pushBot(
          `Classic choice! Basket confirmed — *1x ${item.name}* (₦${item.price.toLocaleString()}). Would you like to add *${SUGGESTED_SIDE.name}* to your order for an extra ₦${SUGGESTED_SIDE.price.toLocaleString()}? 🍟`,
          "side-suggestion",
        ),
      400,
    );
  };

  const acceptSide = () => {
    pushUser(`Yes, add ${SUGGESTED_SIDE.name}`);
    const newCart = [...cart, SUGGESTED_SIDE];
    setCart(newCart);
    const total = newCart.reduce((s, i) => s + i.price, 0);
    setPhase(PHASE.PAYMENT);
    setTimeout(
      () =>
        pushBot(
          `Sharp sharp! 🍟 Added *${SUGGESTED_SIDE.name}*. Your basket total is now *₦${total.toLocaleString()}*. Tap the payment button below to lock in your order! 💪`,
          "pre-payment",
        ),
      350,
    );
  };

  const declineSide = () => {
    pushUser("No, thanks");
    const total = cart.reduce((s, i) => s + i.price, 0);
    setPhase(PHASE.PAYMENT);
    setTimeout(
      () =>
        pushBot(
          `No wahala! 👍 Your basket total stays at *₦${total.toLocaleString()}*. Tap the payment button below to lock in your order! 💪`,
          "pre-payment",
        ),
      350,
    );
  };

  // FIX #2: generate a brand-new unique reference every single time payment is initiated.
  const triggerPayment = () => {
    const newRef = genOrderRef();
    setOrderRef(newRef);
    pushUser("🏛️ Bank Transfer");
    setPhase(PHASE.RECEIPT);
    setTimeout(
      () =>
        pushBot(
          `Perfect! Here are your transfer details. Your unique reference is *${newRef}* — tap any row to copy, send the exact amount with the ref as your narration, then upload your receipt screenshot below.`,
          "bank-card",
        ),
      350,
    );
  };

  const chooseDelivery = () => {
    pushUser("🛵 Home Delivery");
    setPhase(PHASE.ADDRESS);
    setTimeout(
      () =>
        pushBot(
          "Great choice! 🛵 Type your full delivery address in the chat box below — street name, area, and nearest bus stop — and we'll route your rider straight to you!",
          "text",
        ),
      350,
    );
  };

  const choosePickup = () => {
    pushUser("🛍️ Self Pick-Up");
    setPhase(PHASE.PICKUP_DONE);
    setTimeout(
      () =>
        pushBot(
          `Your order will be freshly grilled and ready for collection at ${selectedHub?.full || "your selected hub"} in exactly *20 minutes*! 🛍️ Show ref *${orderRef}* at the counter. See you soon — No dulling! 🔥`,
          "text",
        ),
      350,
    );
  };

  // FIX #3: food order already paid — prompt separate ₦5,000 delivery fee with pickup opt-out.
  const submitAddress = (addr: string) => {
    pushUser(addr);
    const newDelRef = genOrderRef();
    setDeliveryRef(newDelRef);
    setPhase(PHASE.DELIVERY_CHOICE);
    setTimeout(
      () =>
        pushBot(
          `Food order confirmed and paid! 🍔 Routing to *${addr}*.\n\nTo dispatch your order, please pay the delivery fee of *₦${DELIVERY_FEE.toLocaleString()}* separately using the reference code *${newDelRef}*. Or, if you'd prefer to save on delivery, you can choose to come for free self-pickup at our hub instead! 🛍️`,
          "delivery-choice",
        ),
      350,
    );
  };

  const payDeliveryFee = () => {
    pushUser("💳 Pay ₦5,000 Delivery");
    setPhase(PHASE.DELIVERY_RECEIPT);
    setTimeout(
      () =>
        pushBot(
          `Sharp sharp! Here are the transfer details for your *₦${DELIVERY_FEE.toLocaleString()}* delivery fee. Use ref *${deliveryRef}* as your narration, then upload your receipt below.`,
          "delivery-bank-card",
        ),
      350,
    );
  };

  const switchToPickupFromDelivery = () => {
    pushUser("🛍️ Switch to Self-Pickup");
    setDeliveryRef("");
    setPhase(PHASE.PICKUP_DONE);
    setTimeout(
      () =>
        pushBot(
          `Solid move! 💪 No delivery fee charged. Your food will be freshly grilled and ready for collection at *${selectedHub?.full || "your selected hub"}* in *20 minutes*. 🛍️ Show your food ref *${orderRef}* at the counter. See you soon — No dulling! 🔥`,
          "text",
        ),
      350,
    );
  };

  // ── TEXT INTENT INTERCEPTOR ───────────────────────────────────
  const handleSend = async () => {
    const raw = input.trim();
    if (!raw || aiLoading) return;
    setInput("");
    const lower = raw.toLowerCase();
    const isBack = ["back", "home", "return"].some((w) => lower.includes(w));
    const isOrder = ["order", "buy", "get", "food", "shawarma"].some((w) => lower.includes(w));

    switch (phase) {
      case PHASE.HOME: {
        pushUser(raw);
        if (isOrder) goToLocation();
        else await aiChat(raw);
        break;
      }
      case PHASE.VIEW_MENU:
      case PHASE.FAQS: {
        pushUser(raw);
        if (isOrder) goToLocation();
        else if (isBack) goHome();
        else await aiChat(raw);
        break;
      }
      case PHASE.LOCATION: {
        if (isBack) {
          pushUser(raw);
          goHome();
          break;
        }
        const match = HUBS.find((h) => lower.includes(h.label.toLowerCase()));
        if (match) {
          selectHub(match);
          break;
        }
        pushUser(raw);
        pushBot("Abeg tap one of the hub buttons above so I fit load the right kitchen for you! 📍", "text");
        break;
      }
      case PHASE.MENU: {
        if (isBack) {
          pushUser(raw);
          goToLocation();
          break;
        }
        const item = MENU_ITEMS.find((m) => lower.includes(m.name.toLowerCase().split(" ")[0]));
        if (item) {
          selectMenuItem(item);
          break;
        }
        pushUser(raw);
        pushBot("Tap any item on the menu card above to drop it in your basket! 🌯", "text");
        break;
      }
      case PHASE.SUGGEST: {
        pushUser(raw);
        if (["yes", "yeah", "sure", "add", "ok"].some((w) => lower.includes(w))) acceptSide();
        else if (["no", "nope", "skip", "decline"].some((w) => lower.includes(w))) declineSide();
        else pushBot(`Tap *Yes, please* or *No, thanks* above to continue! 🍟`, "text");
        break;
      }
      case PHASE.PAYMENT: {
        pushUser(raw);
        pushBot("Tap the *Pay with Bank Transfer* button above when you ready to lock in your order! 💪", "text");
        break;
      }
      case PHASE.RECEIPT: {
        pushUser(raw);
        pushBot("Just upload your receipt screenshot using the 📎 clip button below and I go confirm am sharp sharp!", "text");
        break;
      }
      case PHASE.FULFILLMENT: {
        pushUser(raw);
        if (lower.includes("deliver") || lower.includes("door")) chooseDelivery();
        else if (lower.includes("pick")) choosePickup();
        else pushBot("Tap *Home Delivery* or *Self Pick-Up* above to continue! 🌯", "text");
        break;
      }
      case PHASE.ADDRESS: {
        submitAddress(raw);
        break;
      }
      case PHASE.DELIVERY_CHOICE: {
        pushUser(raw);
        if (lower.includes("pick")) switchToPickupFromDelivery();
        else if (lower.includes("pay") || lower.includes("deliver")) payDeliveryFee();
        else pushBot("Tap *Pay Delivery* or *Switch to Self-Pickup* above to continue! 🛵", "text");
        break;
      }
      case PHASE.DELIVERY_RECEIPT: {
        pushUser(raw);
        pushBot("Just upload your delivery payment receipt with the 📎 clip button below and I go confirm sharp sharp!", "text");
        break;
      }
      default: {
        pushUser(raw);
        await aiChat(raw);
      }
    }
  };

  // ── INLINE CARDS ──────────────────────────────────────────────
  const renderInline = (msg: Message) => {
    switch (msg.type) {
      case "home":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-start", maxWidth: "82%", width: "82%" }}>
            <QuickButton primary onClick={goToLocation}>🌯 Order Now</QuickButton>
            <QuickButton
              onClick={() => {
                pushUser("View Menu");
                setPhase(PHASE.VIEW_MENU);
                setTimeout(
                  () =>
                    pushBot(
                      "Here's our full lineup of hot shawarmas and grills 🔥 Hungry yet? Type *order* whenever you ready!",
                      "view-menu",
                    ),
                  350,
                );
              }}
            >
              📋 View Menu
            </QuickButton>
            <QuickButton
              onClick={() => {
                pushUser("FAQs");
                setPhase(PHASE.FAQS);
                setTimeout(
                  () =>
                    pushBot(
                      "Quick answers! 💡 We deliver across Lagos in 30–45 mins, payment is by bank transfer, and pickup is ready in 20 mins. Ask me anything else or type *order* to start!",
                      "faqs",
                    ),
                  350,
                );
              }}
            >
              ❓ FAQs
            </QuickButton>
          </div>
        );

      case "view-menu":
        return (
          <div style={{ alignSelf: "flex-start", maxWidth: "88%", width: "88%" }}>
            <div style={{ background: "#fff", border: "1px solid #e9edef", borderRadius: "0 12px 12px 12px", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.06)", maxHeight: 320, overflowY: "auto" }}>
              {MENU_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  <div style={{ background: "#f0f2f5", padding: "6px 13px", fontSize: 11.5, color: "#008069", fontWeight: 800, letterSpacing: 0.2 }}>
                    {cat.category}
                  </div>
                  {cat.items.map((m, i) => (
                    <div key={m.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", borderBottom: i < cat.items.length - 1 ? "1px solid #f0f2f5" : "none", gap: 8 }}>
                      <span style={{ fontSize: 12.5, color: "#111b21", fontWeight: 600, lineHeight: 1.3 }}>{m.emoji} {m.name}</span>
                      <span style={{ fontSize: 12.5, color: "#008069", fontWeight: 700, whiteSpace: "nowrap" }}>₦{m.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <QuickButton primary onClick={goToLocation}>🌯 Start My Order</QuickButton>
            </div>
            <div style={{ marginTop: 6 }}>
              <BackRow onBack={goHome} />
            </div>
          </div>
        );

      case "faqs":
        return (
          <div style={{ alignSelf: "flex-start", maxWidth: "82%", width: "82%" }}>
            <QuickButton primary onClick={goToLocation}>🌯 Order Now</QuickButton>
            <div style={{ marginTop: 6 }}>
              <BackRow onBack={goHome} />
            </div>
          </div>
        );

      case "location":
        return (
          <div style={{ alignSelf: "flex-start", maxWidth: "88%", width: "88%" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {HUBS.map((h) => (
                <button key={h.id} onClick={() => selectHub(h)} className="wa-btn-full" style={{ color: "#008069", fontWeight: 700, fontSize: 13 }}>
                  📍 {h.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <BackRow onBack={goHome} />
            </div>
          </div>
        );

      case "menu":
        return (
          <div style={{ alignSelf: "flex-start", maxWidth: "88%", width: "88%" }}>
            <div style={{ background: "#fff", border: "1px solid #e9edef", borderRadius: "0 12px 12px 12px", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.06)", maxHeight: 340, overflowY: "auto" }}>
              {MENU_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  <div style={{ background: "#f0f2f5", padding: "6px 13px", fontSize: 11.5, color: "#008069", fontWeight: 800, letterSpacing: 0.2, position: "sticky", top: 0 }}>
                    {cat.category}
                  </div>
                  {cat.items.map((m, i) => (
                    <button
                      key={m.name}
                      onClick={() => selectMenuItem(m)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 13px",
                        border: "none",
                        borderBottom: i < cat.items.length - 1 ? "1px solid #f0f2f5" : "none",
                        background: "#fff",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        gap: 8,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 12.5, color: "#111b21", fontWeight: 600, lineHeight: 1.3 }}>{m.emoji} {m.name}</span>
                      <span style={{ fontSize: 11.5, color: "#fff", fontWeight: 700, background: "#008069", borderRadius: 6, padding: "3px 7px", whiteSpace: "nowrap" }}>
                        ₦{m.price.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <BackRow onBack={goToLocation} label="⬅️ Change Hub" />
            </div>
          </div>
        );

      case "side-suggestion":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-start", maxWidth: "82%", width: "82%" }}>
            <QuickButton primary onClick={acceptSide}>✅ Yes, please</QuickButton>
            <QuickButton onClick={declineSide}>❌ No, thanks</QuickButton>
          </div>
        );

      case "pre-payment":
        return (
          <div style={{ alignSelf: "flex-start", maxWidth: "82%", width: "82%" }}>
            <QuickButton primary onClick={triggerPayment}>🏛️ Pay with Bank Transfer</QuickButton>
          </div>
        );

      case "bank-card":
        return (
          <div style={{ alignSelf: "flex-start", maxWidth: "88%", width: "88%" }}>
            <div style={{ background: "#fff", border: "1px solid #e9edef", borderRadius: "0 12px 12px 12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              <div style={{ background: "#008069", color: "#fff", padding: "10px 14px", fontSize: 13, fontWeight: 700 }}>
                💳 Transfer ₦{subtotal.toLocaleString()}
              </div>
              {[
                { label: "Bank", val: BANK.bankName, field: "bank" },
                { label: "Account Name", val: BANK.accountName, field: "name" },
                { label: "Account Number", val: BANK.accountNumber, field: "acct" },
                { label: "Narration / Ref", val: orderRef, field: "ref" },
              ].map((row, i) => (
                <button
                  key={row.field}
                  onClick={() => copyField(row.val, row.field)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: i < 3 ? "1px solid #f0f2f5" : "none",
                    background: "#fff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: "#667781" }}>{row.label}</div>
                    <div style={{ fontSize: 13.5, color: "#111b21", fontWeight: 700 }}>{row.val}</div>
                  </div>
                  <span style={{ fontSize: 11, color: copiedField === row.field ? "#008069" : "#aebac1", fontWeight: 700 }}>
                    {copiedField === row.field ? "Copied ✓" : "Copy 📋"}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <QuickButton primary onClick={openFilePicker}>📎 Upload Payment Receipt</QuickButton>
            </div>
          </div>
        );

      case "fulfillment":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-start", maxWidth: "82%", width: "82%" }}>
            <QuickButton primary onClick={chooseDelivery}>🛵 Home Delivery</QuickButton>
            <QuickButton onClick={choosePickup}>🛍️ Self Pick-Up</QuickButton>
          </div>
        );

      case "delivery-choice":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignSelf: "flex-start", maxWidth: "82%", width: "82%" }}>
            <QuickButton primary onClick={payDeliveryFee}>💳 Pay ₦{DELIVERY_FEE.toLocaleString()} Delivery</QuickButton>
            <QuickButton onClick={switchToPickupFromDelivery}>🛍️ Switch to Self-Pickup</QuickButton>
          </div>
        );

      case "delivery-bank-card":
        return (
          <div style={{ alignSelf: "flex-start", maxWidth: "88%", width: "88%" }}>
            <div style={{ background: "#fff", border: "1px solid #e9edef", borderRadius: "0 12px 12px 12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
              <div style={{ background: "#008069", color: "#fff", padding: "10px 14px", fontSize: 13, fontWeight: 700 }}>
                🛵 Delivery Fee ₦{DELIVERY_FEE.toLocaleString()}
              </div>
              {[
                { label: "Bank", val: BANK.bankName, field: "d-bank" },
                { label: "Account Name", val: BANK.accountName, field: "d-name" },
                { label: "Account Number", val: BANK.accountNumber, field: "d-acct" },
                { label: "Narration / Ref", val: deliveryRef, field: "d-ref" },
              ].map((row, i) => (
                <button
                  key={row.field}
                  onClick={() => copyField(row.val, row.field)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    border: "none",
                    borderBottom: i < 3 ? "1px solid #f0f2f5" : "none",
                    background: "#fff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: "#667781" }}>{row.label}</div>
                    <div style={{ fontSize: 13.5, color: "#111b21", fontWeight: 700 }}>{row.val}</div>
                  </div>
                  <span style={{ fontSize: 11, color: copiedField === row.field ? "#008069" : "#aebac1", fontWeight: 700 }}>
                    {copiedField === row.field ? "Copied ✓" : "Copy 📋"}
                  </span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 6 }}>
              <QuickButton primary onClick={openFilePicker}>📎 Upload Delivery Receipt</QuickButton>
            </div>
          </div>
        );


      case "tracker":
        return <RiderTracker trackingCode={trackingCode} />;

      default:
        return null;
    }
  };

  const showComposer = (
    [
      PHASE.HOME,
      PHASE.VIEW_MENU,
      PHASE.FAQS,
      PHASE.LOCATION,
      PHASE.MENU,
      PHASE.SUGGEST,
      PHASE.ADDRESS,
      PHASE.FULFILLMENT,
      PHASE.RECEIPT,
      PHASE.PAYMENT,
      PHASE.DELIVERY_CHOICE,
      PHASE.DELIVERY_RECEIPT,
    ] as Phase[]
  ).includes(phase);

  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        background: "#0b141a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <style>{keyframes}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 440,
          height: "min(92dvh, 860px)",
          background: "#efeae2",
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ background: "#008069", padding: "10px 14px", display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", background: "#fff", flexShrink: 0 }}>
            <img
              src="https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=200&h=200&fit=crop&crop=faces"
              alt="Willy Shawarma & Grills profile"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 15.5 }}>Willy Shawarma &amp; Grills</div>
            <div style={{ color: "#cfeee7", fontSize: 11.5, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7ee787", display: "inline-block" }} />
              online
            </div>
          </div>
          <div style={{ color: "#cfeee7", fontSize: 20, letterSpacing: 2 }}>⋮</div>
        </div>

        <ProgressBar phase={phase} />

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            backgroundColor: "#efeae2",
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(0,0,0,0.025) 1px, transparent 1px), radial-gradient(circle at 70% 70%, rgba(0,0,0,0.025) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: "stretch" }}>
              {msg.text || msg.type === "receipt-image" ? <Bubble msg={msg} /> : null}
              {renderInline(msg)}
            </div>
          ))}

          {aiLoading && <Typing />}

          {verifying && (
            <div style={{ alignSelf: "flex-start", animation: "popIn 0.2s ease" }}>
              <div style={{ background: "#fff", borderRadius: "0 12px 12px 12px", padding: "10px 14px", fontSize: 13, color: "#667781", display: "flex", alignItems: "center", gap: 9, boxShadow: "0 1px 1px rgba(0,0,0,0.08)" }}>
                <span style={{ width: 16, height: 16, border: "2px solid #d1d7db", borderTopColor: "#008069", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                Verifying your payment…
              </div>
            </div>
          )}

          {verified && (
            <div style={{ alignSelf: "flex-start", animation: "popIn 0.25s ease" }}>
              <div style={{ background: "#d9fdd3", borderRadius: "0 12px 12px 12px", padding: "10px 14px", fontSize: 13.5, color: "#075e54", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 1px 1px rgba(0,0,0,0.08)" }}>
                ✅ Payment Verified!
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {showComposer && (
          <div style={{ background: "#f0f2f5", padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button
              onClick={openFilePicker}
              aria-label="Upload receipt"
              style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "#fff", cursor: "pointer", fontSize: 18, color: "#54656f", flexShrink: 0 }}
            >
              📎
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              placeholder={phase === PHASE.ADDRESS ? "Type your delivery address…" : "Type a message"}
              style={{ flex: 1, border: "none", borderRadius: 22, padding: "11px 16px", fontSize: 14, outline: "none", fontFamily: "inherit", background: "#fff", color: "#111b21" }}
            />
            <button
              onClick={handleSend}
              aria-label="Send message"
              disabled={aiLoading}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "none",
                background: "#008069",
                color: "#fff",
                cursor: aiLoading ? "default" : "pointer",
                fontSize: 18,
                flexShrink: 0,
                opacity: aiLoading ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ➤
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
      </div>
    </div>
  );
}

const keyframes = `
  @keyframes popIn { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-5px); opacity: 1; } }
  .wa-btn-full {
    width: 100%;
    border: 1px solid #e9edef;
    border-radius: 10px;
    padding: 11px 12px;
    cursor: pointer;
    font-family: inherit;
    transition: filter 0.15s ease, transform 0.05s ease;
    box-shadow: 0 1px 2px rgba(0,0,0,0.06);
  }
  .wa-btn-full:hover { filter: brightness(0.97); }
  .wa-btn-full:active { transform: scale(0.985); }
`;
