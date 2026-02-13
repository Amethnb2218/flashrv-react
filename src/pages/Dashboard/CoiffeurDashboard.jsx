import { useEffect, useMemo, useRef, useState } from "react";
import apiFetch from "@/api/client";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { resolveMediaUrl } from "../../utils/media";
import { connectRealtime, subscribeRealtime } from "../../utils/realtime";
import {
FiCalendar,
FiClock,
FiDollarSign,
FiTrendingUp,
FiCheck,
FiX,
FiScissors,
FiImage,
FiSave,
FiPlus,
FiEdit2,
FiTrash2,
FiUser,
FiSettings,
FiBarChart2,
FiGrid,
FiSearch,
FiFilter,
FiChevronDown,
FiAlertTriangle,
FiXCircle,
FiUsers,
FiStar,
FiGift,
FiFileText,
FiCamera,
FiTag,
FiEdit3,
FiCreditCard,
FiMessageCircle,
} from "react-icons/fi";
import AppointmentChatModal from "../../components/Chat/AppointmentChatModal";

/* ----------------------------
Constants
----------------------------- */
const serviceCategories = [
"Coiffure",
"Barbier",
"Tresses",
"Coloration",
"Soin",
"Maquillage",
"Autre",
];

const roles = ["Manager", "Coiffeur", "Barbier", "Apprenti", "Accueil"];

const weekDays = [
["Lundi", "monday"],
["Mardi", "tuesday"],
["Mercredi", "wednesday"],
["Jeudi", "thursday"],
["Vendredi", "friday"],
["Samedi", "saturday"],
["Dimanche", "sunday"],
];

const dayKeyByIndex = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const dayKeyToIndex = dayKeyByIndex.reduce((acc, key, idx) => {
  acc[key] = idx;
  return acc;
}, {});
const pageAnim = {
initial: { opacity: 0, y: 14 },
animate: { opacity: 1, y: 0 },
exit: { opacity: 0, y: -14 },
transition: { duration: 0.2 },
};

// Traduction statuts (rendez-vous, paiement, avis, etc.)
const statusLabels = {
  upcoming: "À venir",
  completed: "Terminé",
  cancelled: "Annulé",
  confirmed: "Confirmé",
  confirmed_on_site: "Confirmé (sur place)",
  in_progress: "En cours",
  pending: "En attente",
  pending_assignment: "En attente d'assignation",
  pending_cash: "En attente (sur place)",
  paid: "Payé",
  deposit_paid: "Acompte payé",
  refunded: "Remboursé",
  failed: "Échec paiement",
  on_site: "Sur place",
  unpaid: "Impayé",
  no_show: "Absence",
  approved: "Approuvé",
  rejected: "Rejeté",
};

const getStatusLabel = (value) => {
  const key = String(value || "").toLowerCase();
  return statusLabels[key] || value || "—";
};

const modalAnim = {
initial: { opacity: 0, scale: 0.98, y: 8 },
animate: { opacity: 1, scale: 1, y: 0 },
exit: { opacity: 0, scale: 0.98, y: 8 },
transition: { duration: 0.18 },
};

const MAX_MEDIA_MB = 6;
const MAX_SERVICE_MEDIA = 6;

/* ----------------------------
Small utils
----------------------------- */
const cx = (...arr) => arr.filter(Boolean).join(" ");

const formatMoney = (n) =>
Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " F";

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif|tiff?)(\?|#|$)/i;
const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)(\?|#|$)/i;

const isImage = (src) => {
  const s = String(src || "");
  if (!s) return false;
  if (s.startsWith("data:image")) return true;
  if (IMAGE_EXT_RE.test(s)) return true;
  if (s.startsWith("http") || s.startsWith("blob:")) return !VIDEO_EXT_RE.test(s);
  return false;
};

const isVideo = (src) => {
  const s = String(src || "");
  if (!s) return false;
  if (s.startsWith("data:video")) return true;
  return VIDEO_EXT_RE.test(s);
};

function clampNumber(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function uuid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

function formatDate(value) {
  try {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR");
  } catch {
    return "";
  }
}

function formatPeriodLabel(period) {
  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  let start = startOfDay(now);
  let end = endOfDay(now);
  if (period === "week") {
    const day = now.getDay(); // 0=Sun
    const diff = day === 0 ? 6 : day - 1; // Monday start
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff));
    end = endOfDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
  } else if (period === "month") {
    start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  } else if (period === "year") {
    start = startOfDay(new Date(now.getFullYear(), 0, 1));
    end = endOfDay(new Date(now.getFullYear(), 11, 31));
  }
  return `${start.toLocaleDateString("fr-FR")} – ${end.toLocaleDateString("fr-FR")}`;
}

function toYmd(d) {
  if (!d) return "";
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTime(d) {
  if (!d) return "";
  if (typeof d === "string" && /^\d{2}:\d{2}/.test(d)) return d.slice(0, 5);
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const h = String(dt.getHours()).padStart(2, "0");
  const m = String(dt.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
function downloadInvoiceLikeFile(invoice) {
const content = `
Facture ${invoice.ref}
Date: ${invoice.date}
Client: ${invoice.clientName}
Salon: ${invoice.salonName}
Service: ${invoice.serviceName}
---
Total: ${formatMoney(invoice.totalAmount)}
Acompte (${invoice.depositPct}%): ${formatMoney(invoice.depositAmount)}
Reste à payer: ${formatMoney(invoice.remainingAmount)}
---
Merci de votre confiance !
`.trim();

const blob = new Blob([content], { type: "text/plain" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `facture-${invoice.ref}.txt`;
a.click();
URL.revokeObjectURL(url);
}

/* ----------------------------
UI building blocks (PRO)
----------------------------- */
function Card({ className = "", children }) {
return (
<div
className={cx(
"bg-white/90 backdrop-blur rounded-3xl border border-gray-100 shadow-sm",
"ring-1 ring-black/5",
className
)}
>
{children}
</div>
);
}

function CardHeader({ icon, title, subtitle, right }) {
return (
<div className="p-6 border-b border-gray-100">
<div className="flex items-start justify-between gap-4">
<div className="flex items-start gap-3">
{icon ? (
<div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
<span className="text-xl">{icon}</span>
</div>
) : null}
<div>
<h2 className="text-lg md:text-xl font-extrabold text-gray-900">
{title}
</h2>
{subtitle ? (
<p className="text-sm text-gray-500 mt-1">{subtitle}</p>
) : null}
</div>
</div>
{right ? <div className="shrink-0">{right}</div> : null}
</div>
</div>
);
}

function Button({ variant = "primary", className = "", ...props }) {
const styles =
variant === "primary"
? "bg-gray-900 text-white hover:bg-gray-800"
: variant === "danger"
? "bg-red-600 text-white hover:bg-red-700"
: "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50";

return (
<button
{...props}
className={cx(
"inline-flex items-center justify-center px-5 py-2.5 rounded-2xl font-semibold transition-colors",
"disabled:opacity-50 disabled:cursor-not-allowed",
"active:translate-y-[1px]",
styles,
className
)}
/>
);
}

function IconButton({ title, className = "", ...props }) {
return (
<button
{...props}
title={title}
className={cx(
"inline-flex items-center justify-center w-10 h-10 rounded-2xl",
"border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 transition-colors",
"active:translate-y-[1px]",
className
)}
/>
);
}

function Badge({ tone = "gray", children }) {
const toneClasses = {
gray: "bg-gray-100 text-gray-800",
amber: "bg-amber-100 text-amber-800",
green: "bg-green-100 text-green-800",
red: "bg-red-100 text-red-800",
blue: "bg-blue-100 text-blue-800",
purple: "bg-purple-100 text-purple-800",
};

return (
<span
className={cx(
"inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold",
toneClasses[tone] || toneClasses.gray
)}
>
{children}
</span>
);
}
// Carte Statistique pour dashboard
function StatCard({ icon, label, value, color }) {
	const toneClasses = {
		amber: "bg-amber-100 text-amber-800",
		blue: "bg-blue-100 text-blue-800",
		green: "bg-green-100 text-green-800",
		red: "bg-red-100 text-red-800",
		gray: "bg-gray-100 text-gray-800",
	};
	return (
		<div className={`rounded-3xl p-5 flex items-center gap-4 shadow border border-gray-100 ${toneClasses[color] || toneClasses.gray}`}>
			<div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/60">
				{icon}
			</div>
			<div>
				<div className="text-lg font-bold">{value}</div>
				<div className="text-sm font-semibold text-gray-600">{label}</div>
			</div>
		</div>
	);
}

function Input({ label, className = "", hint, ...props }) {
return (
<div className={className}>
{label ? (
<label className="block text-sm font-semibold text-gray-700 mb-1">
{label}
</label>
) : null}
<input
{...props}
className={cx(
"w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white",
"focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
)}
/>
{hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
</div>
);
}

function Textarea({ label, className = "", ...props }) {
return (
<div className={className}>
{label ? (
<label className="block text-sm font-semibold text-gray-700 mb-1">
{label}
</label>
) : null}
<textarea
{...props}
className={cx(
"w-full px-4 py-2.5 border border-gray-200 rounded-2xl bg-white",
"focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
)}
/>
</div>
);
}

function Select({ label, className = "", children, ...props }) {
return (
<div className={className}>
{label ? (
<label className="block text-sm font-semibold text-gray-700 mb-1">
{label}
</label>
) : null}
<div className="relative">
<select
{...props}
className={cx(
"w-full appearance-none px-4 py-2.5 border border-gray-200 rounded-2xl bg-white",
"focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
)}
>
{children}
</select>
<FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
</div>
</div>
);
}

function EmptyState({ icon, title, subtitle, action }) {
return (
<div className="text-center py-12">
<div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-100 mx-auto flex items-center justify-center">
<div className="text-gray-300 text-3xl">{icon}</div>
</div>
<h3 className="text-lg font-extrabold text-gray-900 mt-4">{title}</h3>
{subtitle ? <p className="text-gray-500 mt-1">{subtitle}</p> : null}
{action ? <div className="mt-5">{action}</div> : null}
</div>
);
}

function Modal({ open, title, children, onClose, footer }) {
return (
<AnimatePresence>
{open ? (
<motion.div
className="fixed inset-0 bg-black/50 z-50 p-4 flex items-center justify-center"
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
onClick={onClose}
>
<motion.div
{...modalAnim}
className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-gray-100 overflow-hidden"
onClick={(e) => e.stopPropagation()}
>
<div className="p-5 border-b border-gray-100 flex items-center justify-between">
<h3 className="text-base md:text-lg font-extrabold text-gray-900">
{title}
</h3>
<button
onClick={onClose}
className="w-10 h-10 rounded-2xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
title="Fermer"
>
<FiXCircle />
</button>
</div>
<div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
{footer ? (
<div className="p-5 border-t border-gray-100 bg-gray-50">
{footer}
</div>
) : null}
</motion.div>
</motion.div>
) : null}
</AnimatePresence>
);
}

function DataTable({ columns, data, emptyLabel }) {
if (!data?.length) {
return <EmptyState icon={<FiGrid />} title={emptyLabel || "Aucune donnée"} />;
}
return (
<div className="overflow-x-auto rounded-2xl border border-gray-100">
<table className="min-w-full text-left">
<thead className="bg-gray-50">
<tr>
{columns.map((c) => (
<th
key={c.key}
className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-gray-600"
>
{c.label}
</th>
))}
</tr>
</thead>
<tbody className="bg-white">
{data.map((row, idx) => (
<tr
key={row.id || idx}
className={cx(
"border-t border-gray-100",
"hover:bg-gray-50/60 transition-colors"
)}
>
{columns.map((c) => (
<td key={c.key} className="px-4 py-3 text-sm text-gray-800">
{typeof c.render === "function" ? c.render(row) : row[c.key] ?? "-"}
</td>
))}
</tr>
))}
</tbody>
</table>
</div>
);
}

/* ----------------------------
Main Component
----------------------------- */
export default function CoiffeurDashboard() {
const { isAuthenticated, checkAuth, user } = useAuth();

// IMPORTANT: on garde l'onglet "portfolio" MAIS le label est "Salon".
// Donc activeTab doit toujours être "portfolio" (et surtout PAS "salon").
const [activeTab, setActiveTab] = useState("appointments");

// data
const [appointments, setAppointments] = useState([]);
const [services, setServices] = useState([]);
const [loading, setLoading] = useState(true);
const [notifications, setNotifications] = useState([]);
const [unreadNotifications, setUnreadNotifications] = useState(0);
const [chatAppointment, setChatAppointment] = useState(null);
const [showChatModal, setShowChatModal] = useState(false);

// Payment methods
const [paymentMethods, setPaymentMethods] = useState([]); // {id, method, enabled}
const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
const [confirmPaymentMethod, setConfirmPaymentMethod] = useState(null);
const [deletingPaymentMethod, setDeletingPaymentMethod] = useState(false);
const [newPaymentMethod, setNewPaymentMethod] = useState({
method: "",
enabled: true,
});

// Team management
const [team, setTeam] = useState([]);
const [showTeamModal, setShowTeamModal] = useState(false);
const [editingMember, setEditingMember] = useState(null);
const [newMember, setNewMember] = useState({
name: "",
role: roles[1],
phone: "",
active: true,
availability: {
monday: { open: "09:00", close: "18:00" },
tuesday: { open: "09:00", close: "18:00" },
wednesday: { open: "09:00", close: "18:00" },
thursday: { open: "09:00", close: "18:00" },
friday: { open: "09:00", close: "18:00" },
saturday: { open: "10:00", close: "18:00" },
sunday: null,
},
});

// Planning
const [planning, setPlanning] = useState({
breaks: [],
exceptions: [],
holidays: [],
});
const [showPlanningModal, setShowPlanningModal] = useState(false);
const [planningForm, setPlanningForm] = useState({
type: "break", // break | exception | holiday
date: "",
start: "12:00",
end: "13:00",
label: "Pause",
open: "09:00",
close: "18:00",
closed: false,
name: "Jour férié",
});

// Payments + invoices
const [payments, setPayments] = useState([]);
const [invoices, setInvoices] = useState([]);

// Salon gallery (ancien "portfolio")
const [portfolio, setPortfolio] = useState([]);
const [showPortfolioModal, setShowPortfolioModal] = useState(false);
const [portfolioForm, setPortfolioForm] = useState({
type: "gallery",
title: "",
media: "",
mediaFile: null,
beforeMedia: "",
beforeFile: null,
afterMedia: "",
afterFile: null,
});

// Reviews
const [reviews, setReviews] = useState([]);
const [reviewFilter, setReviewFilter] = useState("all");

// Promos + loyalty
const [promos, setPromos] = useState([]);
const [showPromoModal, setShowPromoModal] = useState(false);
const [promoForm, setPromoForm] = useState({
code: "",
type: "percent",
value: 10,
expiresAt: "",
active: true,
});

const [loyalty, setLoyalty] = useState({
enabled: true,
pointsPerBooking: 10,
rewardThreshold: 100,
rewardLabel: "10% de réduction",
});

// CRM clients
const [clients, setClients] = useState([]);
const [clientQuery, setClientQuery] = useState("");
const [selectedClient, setSelectedClient] = useState(null);
const [clientAddressDraft, setClientAddressDraft] = useState("");
const [savingClientAddress, setSavingClientAddress] = useState(false);

// stats
const [statsPeriod, setStatsPeriod] = useState("month");
const [stats, setStats] = useState({
totalRevenue: 0,
totalBookings: 0,
averageTicket: 0,
cancelledBookings: 0,
completedBookings: 0,
topServices: [],
});

// settings
const [salonSettings, setSalonSettings] = useState({
name: "",
phone: "",
whatsapp: "",
address: "",
description: "",
image: "",
openingHours: {
monday: { open: "09:00", close: "18:00" },
tuesday: { open: "09:00", close: "18:00" },
wednesday: { open: "09:00", close: "18:00" },
thursday: { open: "09:00", close: "18:00" },
friday: { open: "09:00", close: "18:00" },
saturday: { open: "10:00", close: "18:00" },
sunday: null,
},
});

const [savingSettings, setSavingSettings] = useState(false);
// services modal state
const [showServiceModal, setShowServiceModal] = useState(false);
const [editingService, setEditingService] = useState(null);
const [confirmDelete, setConfirmDelete] = useState(null);

const [newService, setNewService] = useState({
name: "",
category: serviceCategories[0],
description: "",
price: "",
duration: 30,
depositPercentage: 30,
media: "",
mediaList: [],
mediaFiles: [],
});

// services filters
const [serviceQuery, setServiceQuery] = useState("");
const [serviceCategory, setServiceCategory] = useState("all");
const [serviceSort, setServiceSort] = useState("recent");

const fileInputRef = useRef(null);

const tabs = useMemo(
() => [
{ id: "appointments", label: "Rendez-vous", icon: FiCalendar },
{ id: "services", label: "Services", icon: FiScissors },
{ id: "team", label: "Équipe", icon: FiUsers },
{ id: "planning", label: "Planning", icon: FiClock },
{ id: "payments", label: "Paiements", icon: FiDollarSign },
{ id: "paymentMethods", label: "Moyens de paiement", icon: FiCreditCard },
// ? on garde l'id "portfolio", mais le label affiché = "Salon"
{ id: "portfolio", label: "Salon", icon: FiCamera },
{ id: "reviews", label: "Avis", icon: FiStar },
{ id: "promos", label: "Promos & Fidélité", icon: FiGift },
{ id: "crm", label: "CRM Clients", icon: FiUser },
{ id: "stats", label: "Stats", icon: FiBarChart2 },
{ id: "settings", label: "Paramètres", icon: FiSettings },
],
[]
);

const asArray = (res) => (Array.isArray(res) ? res : res?.data ?? []);
const normalizeService = (service) => {
  const rawImages = Array.isArray(service?.images) ? service.images : [];
  const images = rawImages
    .map((img) => img?.url || img?.media || img?.imageUrl || img)
    .filter(Boolean);
  const media =
    service?.media ||
    service?.imageUrl ||
    service?.image ||
    service?.photo ||
    service?.picture ||
    images[0] ||
    "";
  return {
    ...service,
    media,
    images,
  };
};
const normalizePortfolioItem = (item) => {
  if (!item) return item;
  if (item.media || item.beforeMedia || item.afterMedia) return item;
  const beforeMedia = item.beforeMedia || item.beforeUrl || item.before || "";
  const afterMedia = item.afterMedia || item.afterUrl || item.after || "";
  const media = item.media || item.url || item.imageUrl || item.image || "";
  const type = item.type || (beforeMedia || afterMedia ? "beforeAfter" : "gallery");
  const title = item.title || item.caption || (media ? "Photo" : "Salon");
  return { ...item, type, title, media, beforeMedia, afterMedia };
};
const normalizePortfolioList = (items = []) => {
  const list = Array.isArray(items) ? items : [];
  const grouped = new Map();
  const out = [];
  list.forEach((raw) => {
    const item = normalizePortfolioItem(raw);
    const category = String(item.category || "").toLowerCase();
    const caption = String(item.caption || item.title || "");
    let title = caption;
    let groupId = "";
    if (caption.includes("||")) {
      const parts = caption.split("||");
      title = parts[0] || title;
      groupId = parts[1] || "";
    }
    if ((category === "before" || category === "after") && groupId) {
      const existing = grouped.get(groupId) || {
        id: groupId,
        type: "beforeAfter",
        title: title || "Avant/Après",
        beforeMedia: "",
        afterMedia: "",
        ids: [],
        createdAt: item.createdAt,
      };
      if (category === "before") existing.beforeMedia = item.url || item.media || "";
      if (category === "after") existing.afterMedia = item.url || item.media || "";
      existing.ids = [...new Set([...(existing.ids || []), item.id])];
      if (!existing.createdAt && item.createdAt) existing.createdAt = item.createdAt;
      grouped.set(groupId, existing);
      return;
    }
    out.push({
      ...item,
      type: "gallery",
      title: item.title || item.caption || "Photo",
      media: item.media || item.url || "",
      ids: [item.id],
    });
  });
  grouped.forEach((v) => out.push(v));
  return out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
};
const normalizeReview = (r) => {
  if (!r) return r;
  const status = String(r.status || "approved").toLowerCase();
  return {
    ...r,
    clientName: r.clientName || r.user?.name || r.user?.username || r.user?.email || "Client",
    status,
  };
};
const normalizePromo = (promo) => {
  if (!promo) return promo;
  const typeRaw = promo.type || "percent";
  const type = typeRaw === "fixed" ? "amount" : typeRaw;
  return {
    ...promo,
    code: String(promo.code || "").toUpperCase(),
    type,
    value: promo.value ?? promo.discount ?? 0,
    active: promo.active ?? promo.isActive ?? false,
    expiresAt: promo.expiresAt || (promo.validTo ? toYmd(promo.validTo) : ""),
  };
};
const normalizeClient = (client) => {
  if (!client) return client;
  return {
    ...client,
    name: client.name || client.username || "Client",
    phone: client.phone || client.phoneNumber || "",
    address: client.address || "",
    noShowCount: client.noShowCount || 0,
    history: client.history || [],
    preferences: client.preferences || "",
    notes: client.notes || "",
  };
};
const normalizeAppointment = (appt) => {
  if (!appt) return appt;
  const statusMap = {
    PENDING: "pending",
    PENDING_ASSIGNMENT: "pending_assignment",
    CONFIRMED: "confirmed",
    CONFIRMED_ON_SITE: "confirmed_on_site",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    NO_SHOW: "no_show",
  };
  const paymentMap = {
    PENDING: "pending",
    PENDING_CASH: "pending_cash",
    ON_SITE: "on_site",
    COMPLETED: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
  };
  const statusRaw = String(appt.status || "").toUpperCase();
  const paymentRaw = String(appt.payment?.status || appt.paymentStatus || "").toUpperCase();
  const statusKey = statusMap[statusRaw] || String(appt.status || "").toLowerCase();
  const paymentKey = paymentMap[paymentRaw] || String(appt.paymentStatus || "").toLowerCase();
  const clientName = appt.client?.name || appt.client?.username || appt.clientName || "Client";
  const clientAddress = appt.client?.address || appt.clientAddress || "";
  const serviceName = appt.service?.name || appt.serviceName || "Service";
  const staffName = appt.coiffeur?.user?.name || appt.staffName || appt.employeeName || "";
  const date = appt.date || appt.startDate || appt.day || "";
  const time = appt.startTime || appt.time || "";
  const amount = appt.totalPrice ?? appt.amount ?? appt.service?.price ?? 0;

  return {
    ...appt,
    clientName,
    clientAddress,
    serviceName,
    staffName,
    date,
    time,
    amount,
    status: statusKey,
    paymentStatus: paymentKey || (appt.depositPaid ? "deposit_paid" : paymentKey),
  };
};
const normalizeBreak = (b) => {
  if (!b) return b;
  const date = toYmd(b.date || b.start || b.end);
  return {
    ...b,
    date,
    start: b.start ? toTime(b.start) : b.startTime ? toTime(b.startTime) : toTime(b.start),
    end: b.end ? toTime(b.end) : b.endTime ? toTime(b.endTime) : toTime(b.end),
    label: b.label || "Pause",
  };
};
const normalizeException = (ex) => {
  if (!ex) return ex;
  let closed = !!ex.closed;
  let open = ex.open || "";
  let close = ex.close || "";
  if (!open && !close && typeof ex.reason === "string") {
    if (ex.reason.includes("closed")) closed = true;
    const openMatch = ex.reason.match(/open:([^;]+)/);
    const closeMatch = ex.reason.match(/close:([^;]+)/);
    open = openMatch ? openMatch[1] : "";
    close = closeMatch ? closeMatch[1] : "";
  }
  return {
    ...ex,
    date: toYmd(ex.date),
    closed,
    open: toTime(open),
    close: toTime(close),
  };
};
const normalizeHoliday = (h) => {
  if (!h) return h;
  const rawName = h?.name || h?.label || "";
  let safeName = String(rawName || "Jour férié");
  if (safeName.includes("Ã") || safeName.includes("ï¿½")) {
    try {
      safeName = decodeURIComponent(escape(safeName));
    } catch {
      // ignore
    }
  }
  return {
    ...h,
    date: toYmd(h?.date),
    name: safeName.includes("�") || safeName.includes("ï¿½") ? "Jour férié" : safeName,
  };
};

const normalizePayment = (p) => {
  if (!p) return p;
  const appt = p.appointment || p.booking || p.reservation || {};
  const client = appt.client || p.client || p.user || {};
  const service = appt.service || p.service || {};
  const amount = p.totalAmount ?? p.amount ?? appt.totalPrice ?? service.price ?? 0;
  const depositPct = appt.depositPercentage ?? service.depositPercentage ?? p.depositPercentage ?? 0;
  const paymentRaw = String(p.status || p.paymentStatus || "").toUpperCase();
  const paymentMap = {
    PENDING: "pending",
    PENDING_CASH: "pending_cash",
    ON_SITE: "on_site",
    COMPLETED: "paid",
    FAILED: "failed",
    REFUNDED: "refunded",
  };
  const paymentKey = paymentMap[paymentRaw] || String(p.status || p.paymentStatus || "").toLowerCase();
  const baseDepositPaid = p.depositPaid ?? appt.depositPaid;
  const depositPaid = baseDepositPaid ?? (paymentKey === "paid" || paymentKey === "on_site");
  return {
    ...p,
    appointmentId: appt.id || p.appointmentId,
    clientName: client.name || client.username || client.email || "Client",
    serviceName: service.name || appt.serviceName || "Service",
    amount,
    depositPct,
    depositPaid,
    paymentStatus: paymentKey,
  };
};

const parseSalonPreferences = (prefs) => {
  if (!prefs) return {};
  if (typeof prefs === "object") return prefs;
  try {
    return JSON.parse(prefs);
  } catch (e) {
    return {};
  }
};

const openingHoursFromApi = (list) => {
  const base = {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  };
  (Array.isArray(list) ? list : []).forEach((h) => {
    const key = dayKeyByIndex[h.dayOfWeek];
    if (!key) return;
    base[key] = h.isClosed
      ? null
      : {
          open: h.openTime || "09:00",
          close: h.closeTime || "18:00",
        };
  });
  return base;
};

const openingHoursToApi = (openingHours) =>
  weekDays.map(([, key]) => {
    const h = openingHours?.[key];
    return {
      dayOfWeek: dayKeyToIndex[key],
      openTime: h?.open || "09:00",
      closeTime: h?.close || "18:00",
      isClosed: !h,
    };
  });
/* ----------------------------
Payment methods (API)
----------------------------- */
const handleAddPaymentMethod = async () => {
if (!newPaymentMethod.method.trim()) {
toast.error("Le nom du moyen de paiement est requis.");
return;
}
try {
const res = await apiFetch("/salon/payment-methods", {
method: "POST",
body: newPaymentMethod,
});
const createdPaymentMethod = res?.data ?? res;
setPaymentMethods((prev) => [createdPaymentMethod, ...prev]);
setShowPaymentMethodModal(false);
setNewPaymentMethod({ method: "", enabled: true });
toast.success("Moyen de paiement ajouté !");
} catch (e) {
toast.error(e.message || "Erreur lors de l'ajout");
}
};

const handleDeletePaymentMethod = async (id) => {
if (!id) return;
try {
setDeletingPaymentMethod(true);
await apiFetch(`/salon/payment-methods/${id}`, { method: "DELETE" });
setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
toast.success("Moyen de paiement supprimé.");
} catch (e) {
toast.error(e.message || "Erreur lors de la suppression");
} finally {
setDeletingPaymentMethod(false);
setConfirmPaymentMethod(null);
}
};

// Fetch payment methods when tab active
useEffect(() => {
const fetchPaymentMethods = async () => {
setLoadingPaymentMethods(true);
try {
let authed = isAuthenticated;
if (!authed) {
const user = await checkAuth();
authed = !!user;
}
if (!authed) {
toast.error("Vous devez être connecté pour voir les moyens de paiement.");
window.location.reload();
return;
}
const res = await apiFetch("/salon/payment-methods");
setPaymentMethods(asArray(res));
} catch (err) {
toast.error("Erreur chargement moyens de paiement: " + (err.message || err));
} finally {
setLoadingPaymentMethods(false);
}
};

if (activeTab === "paymentMethods") {
fetchPaymentMethods();
}
}, [activeTab, isAuthenticated, checkAuth]);

/* ----------------------------
Initial loading (API)
----------------------------- */
useEffect(() => {
setLoading(true);
Promise.all([
apiFetch("/services"),
apiFetch("/team"),
apiFetch("/appointments"),
apiFetch("/clients"),
apiFetch("/reviews"),
apiFetch("/promos"),
apiFetch("/portfolio"),
apiFetch("/planning/breaks"),
apiFetch("/planning/exceptions"),
apiFetch("/planning/holidays"),
apiFetch("/payments"),
apiFetch("/loyalty"),
apiFetch("/notifications"),
])
.then(
([
servicesRes,
teamRes,
appointmentsRes,
clientsRes,
reviewsRes,
promosRes,
portfolioRes,
breaksRes,
exceptionsRes,
holidaysRes,
paymentsRes,
loyaltyRes,
notificationsRes,
]) => {
setServices(asArray(servicesRes).map(normalizeService));
setTeam(asArray(teamRes));
setAppointments(asArray(appointmentsRes).map(normalizeAppointment));
setClients(asArray(clientsRes).map(normalizeClient));
setReviews(asArray(reviewsRes).map(normalizeReview));
setPromos(asArray(promosRes).map(normalizePromo));
setPortfolio(normalizePortfolioList(asArray(portfolioRes)));
setPlanning({
breaks: asArray(breaksRes).map(normalizeBreak),
exceptions: asArray(exceptionsRes).map(normalizeException),
holidays: asArray(holidaysRes).map(normalizeHoliday),
});
setPayments(asArray(paymentsRes).map(normalizePayment));
const loyaltySettings = loyaltyRes?.settings || loyaltyRes?.data?.settings;
if (loyaltySettings) setLoyalty(loyaltySettings);
const notificationList = notificationsRes?.data?.notifications || [];
setNotifications(notificationList);
setUnreadNotifications(notificationsRes?.data?.unreadCount || 0);
}
)
.catch((err) => {
let msg = "Erreur lors du chargement des données";
if (err && err.message) msg += ` : ${err.message}`;
toast.error(msg);
})
.finally(() => setLoading(false));
}, []);

useEffect(() => {
fetchSalonSettings();
}, []);

useEffect(() => {
  const loadNotifications = async () => {
    try {
      const res = await apiFetch("/notifications");
      setNotifications(res?.data?.notifications || []);
      setUnreadNotifications(res?.data?.unreadCount || 0);
    } catch (e) {
      // no-op
    }
  };
  loadNotifications();

  const token = localStorage.getItem("flashrv_token");
  if (token) {
    connectRealtime(token);
  }
  const unsubscribe = subscribeRealtime((event) => {
    if (event?.type === "notification:new" && event?.payload) {
      const incoming = event.payload;
      setNotifications((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev;
        return [incoming, ...prev].slice(0, 50);
      });
      if (!incoming.isRead) {
        setUnreadNotifications((prev) => prev + 1);
      }
    }
  });

  return unsubscribe;
}, []);

useEffect(() => {
// TODO: refetch stats by period
}, [statsPeriod]);

useEffect(() => {
if (selectedClient) {
setClientAddressDraft(selectedClient.address || "");
}
}, [selectedClient]);

const markAllNotificationsRead = async () => {
  try {
    await apiFetch("/notifications/read-all", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadNotifications(0);
  } catch (e) {
    toast.error("Erreur lecture notifications");
  }
};

/* ----------------------------
Media handling
----------------------------- */
const readMediaAsDataUrl = (file, cb) => {
const reader = new FileReader();
reader.onload = (event) => cb(String(event.target?.result || ""));
reader.readAsDataURL(file);
};

const readMediaAsDataUrlAsync = (file) =>
new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = (event) => resolve(String(event.target?.result || ""));
reader.onerror = reject;
reader.readAsDataURL(file);
});

const uploadSalonImage = async (file) => {
  const formData = new FormData();
  formData.append("image", file);
  const res = await apiFetch("/salons/me/image", { method: "POST", body: formData });
  const data = res?.data ?? res;
  return data?.image || data?.url || "";
};

const validateMedia = (file) => {
const mb = file.size / (1024 * 1024);
if (mb > MAX_MEDIA_MB) {
toast.error(`Fichier trop lourd (max ${MAX_MEDIA_MB}MB).`);
return false;
}
const ok = file.type.startsWith("image/") || file.type.startsWith("video/");
if (!ok) {
toast.error("Format non supporté. (image/* ou video/*)");
return false;
}
return true;
};

const appendServiceMedia = async (files, setter) => {
const list = Array.from(files || []);
const valid = list.filter((file) => validateMedia(file));
if (!valid.length) return;
const previews = await Promise.all(valid.map((file) => readMediaAsDataUrlAsync(file)));
setter((prev) => {
  const prevList = Array.isArray(prev.mediaList) ? prev.mediaList : [];
  const prevFiles = Array.isArray(prev.mediaFiles) ? prev.mediaFiles : [];
  const nextList = [...prevList, ...previews].slice(0, MAX_SERVICE_MEDIA);
  const nextFiles = [...prevFiles, ...valid].slice(0, MAX_SERVICE_MEDIA);
  return {
    ...prev,
    mediaList: nextList,
    mediaFiles: nextFiles,
    media: nextList[0] || "",
  };
});
};

const removeServiceMediaAt = (index, setter) => {
setter((prev) => {
  const prevList = Array.isArray(prev.mediaList) ? prev.mediaList : [];
  const prevFiles = Array.isArray(prev.mediaFiles) ? prev.mediaFiles : [];
  const nextList = prevList.filter((_, i) => i !== index);
  const nextFiles = prevFiles.filter((_, i) => i !== index);
  return {
    ...prev,
    mediaList: nextList,
    mediaFiles: nextFiles,
    media: nextList[0] || "",
  };
});
};

const setServiceCover = (index, setter) => {
setter((prev) => {
  const prevList = Array.isArray(prev.mediaList) ? [...prev.mediaList] : [];
  const prevFiles = Array.isArray(prev.mediaFiles) ? [...prev.mediaFiles] : [];
  if (!prevList[index]) return prev;
  const [img] = prevList.splice(index, 1);
  const [file] = prevFiles.splice(index, 1);
  prevList.unshift(img);
  prevFiles.unshift(file);
  return {
    ...prev,
    mediaList: prevList,
    mediaFiles: prevFiles,
    media: prevList[0] || "",
  };
});
};

/* ----------------------------
Services computed list
----------------------------- */
const filteredServices = useMemo(() => {
let list = [...services];
if (serviceCategory !== "all") list = list.filter((s) => s.category === serviceCategory);

const q = serviceQuery.trim().toLowerCase();
if (q) {
list = list.filter((s) => {
const hay = `${s.name} ${s.category} ${s.description || ""}`.toLowerCase();
return hay.includes(q);
});
}

const sorters = {
recent: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
priceAsc: (a, b) => (a.price || 0) - (b.price || 0),
priceDesc: (a, b) => (b.price || 0) - (a.price || 0),
durationAsc: (a, b) => (a.duration || 0) - (b.duration || 0),
durationDesc: (a, b) => (b.duration || 0) - (a.duration || 0),
};
list.sort(sorters[serviceSort] || sorters.recent);

return list;
}, [services, serviceCategory, serviceQuery, serviceSort]);

const filteredReviews = useMemo(() => {
if (reviewFilter === "all") return reviews;
return reviews.filter((r) => r.status === reviewFilter);
}, [reviews, reviewFilter]);

const filteredClients = useMemo(() => {
const q = clientQuery.trim().toLowerCase();
if (!q) return clients;
return clients.filter((c) =>
`${c.name} ${c.phone} ${c.email || ""} ${c.address || ""}`.toLowerCase().includes(q)
);
}, [clients, clientQuery]);

/* ----------------------------
Actions - Services
----------------------------- */
const resetNewService = () =>
setNewService({
name: "",
category: serviceCategories[0],
description: "",
price: "",
duration: 30,
depositPercentage: 30,
media: "",
mediaList: [],
mediaFiles: [],
});

const handleAddService = async () => {
const name = newService.name?.trim();
const price = Number(newService.price);
if (!name) return toast.error("Le nom du service est obligatoire.");
if (!price || price <= 0) return toast.error("Le prix est obligatoire.");
try {
  const form = new FormData();
  form.append("name", name);
  form.append("category", newService.category);
  form.append("description", newService.description?.trim() || "");
  form.append("price", String(price));
  form.append("duration", String(clampNumber(newService.duration, 15, 360)));
  form.append("depositPercentage", String(clampNumber(newService.depositPercentage, 0, 80)));
  if (Array.isArray(newService.mediaFiles) && newService.mediaFiles.length) {
    newService.mediaFiles.forEach((file) => form.append("images", file));
  }
  const existingUrls = Array.isArray(newService.mediaList)
    ? newService.mediaList.filter((_, idx) => !newService.mediaFiles?.[idx])
    : [];
  if (existingUrls.length) {
    form.append("imageUrls", JSON.stringify(existingUrls));
  }
  if (newService.media) form.append("imageUrl", newService.media);
  const res = await apiFetch("/services", { method: "POST", body: form });
  const created = normalizeService(res?.data || res);
  setServices((prev) => [created, ...prev]);
  toast.success("Service ajouté !");
  setShowServiceModal(false);
  resetNewService();
} catch (err) {
  toast.error("Erreur ajout service: " + (err.message || err));
}
};

const handleUpdateService = async () => {
if (!editingService?.id) return;
const name = String(editingService.name || "").trim();
if (!name) return toast.error("Le nom est obligatoire.");

const updated = {
  ...editingService,
  name,
  price: Number(editingService.price || 0),
  duration: clampNumber(editingService.duration, 15, 360),
  depositPercentage: clampNumber(editingService.depositPercentage ?? 30, 0, 80),
};

if (!updated.price || updated.price <= 0) return toast.error("Prix invalide.");
try {
  const form = new FormData();
  form.append("name", updated.name);
  form.append("description", updated.description || "");
  form.append("price", String(updated.price));
  form.append("duration", String(updated.duration));
  form.append("category", updated.category || "");
  form.append("depositPercentage", String(updated.depositPercentage ?? 0));
  const mediaList =
    Array.isArray(updated.mediaList) && updated.mediaList.length
      ? updated.mediaList
      : updated.media
      ? [updated.media]
      : [];
  const mediaFiles = Array.isArray(updated.mediaFiles) ? updated.mediaFiles : [];
  if (mediaFiles.length) {
    mediaFiles.forEach((file) => file && form.append("images", file));
  }
  const existingUrls = mediaList.filter((_, idx) => !mediaFiles[idx]);
  if (existingUrls.length) {
    form.append("imageUrls", JSON.stringify(existingUrls));
  }
  if (updated.media) form.append("imageUrl", updated.media);
  const res = await apiFetch(`/services/${updated.id}`, { method: "PATCH", body: form });
  const saved = normalizeService(res?.data || res);
  setServices((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...saved } : s)));
  toast.success("Service mis à jour !");
  setEditingService(null);
} catch (err) {
  toast.error("Erreur mise à jour: " + (err.message || err));
}
};

const confirmDeleteService = async () => {
if (!confirmDelete?.id) return;
try {
  await apiFetch(`/services/${confirmDelete.id}`, { method: "DELETE" });
  setServices((prev) => prev.filter((s) => s.id !== confirmDelete.id));
  toast.success("Service supprimé.");
  setConfirmDelete(null);
} catch (err) {
  toast.error("Erreur suppression: " + (err.message || err));
}
};

/* ----------------------------
Actions - Appointments & Payments
----------------------------- */
const setAppointmentStatus = (id, status) => {
const statusMap = {
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  confirmed: "CONFIRMED",
  confirmed_on_site: "CONFIRMED_ON_SITE",
  pending: "PENDING",
  pending_assignment: "PENDING_ASSIGNMENT",
  in_progress: "IN_PROGRESS",
  no_show: "NO_SHOW",
};
const apiStatus = statusMap[status] || String(status || "").toUpperCase();
apiFetch(`/appointments/${id}/status`, { method: "PATCH", body: { status: apiStatus } })
  .then(() => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success("Statut mis à jour.");
  })
  .catch((err) => {
    toast.error("Erreur mise à jour statut: " + (err.message || err));
  });
};

const generateInvoiceForAppointment = (appt) => {
const depositAmount = Math.round((appt.amount * (appt.depositPct || 0)) / 100);
const remainingAmount = Math.max(0, appt.amount - depositAmount);
const invoice = {
id: uuid("inv"),
ref: `INV-${Math.random().toString(10).slice(2, 10)}`,
date: new Date().toISOString().slice(0, 10),
clientName: appt.clientName,
salonName: salonSettings.name || "Mon Salon",
serviceName: appt.serviceName,
totalAmount: appt.amount,
depositPct: appt.depositPct || 0,
depositAmount,
remainingAmount,
};
setInvoices((prev) => [invoice, ...prev]);
toast.success("Facture générée.");
downloadInvoiceLikeFile(invoice);
};

const refundAppointmentDeposit = async (appt) => {
if (!appt?.depositPaid || (appt.depositPct || 0) <= 0) {
toast.error("Aucun acompte à rembourser.");
return;
}
const paymentId = appt.payment?.id;
if (!paymentId) {
toast.error("Paiement introuvable pour ce rendez-vous.");
return;
}
try {
await apiFetch(`/payments/${paymentId}/refund`, { method: "PATCH" });
setAppointments((prev) =>
prev.map((a) =>
a.id === appt.id ? { ...a, paymentStatus: "refunded", depositPaid: false } : a
)
);
toast.success("Remboursement effectué.");
} catch (err) {
toast.error("Erreur remboursement: " + (err.message || err));
}
};

/* ----------------------------
Actions - Team
----------------------------- */
const resetNewMember = () =>
setNewMember({
name: "",
role: roles[1],
phone: "",
active: true,
availability: {
monday: { open: "09:00", close: "18:00" },
tuesday: { open: "09:00", close: "18:00" },
wednesday: { open: "09:00", close: "18:00" },
thursday: { open: "09:00", close: "18:00" },
friday: { open: "09:00", close: "18:00" },
saturday: { open: "10:00", close: "18:00" },
sunday: null,
},
});

const addMember = async () => {
if (!newMember.name.trim()) return toast.error("Nom requis.");
try {
  const payload = {
    name: newMember.name.trim(),
    role: newMember.role,
    phone: newMember.phone || "",
    email: newMember.email || "",
    isActive: !!newMember.active,
  };
  const res = await apiFetch("/team", { method: "POST", body: payload });
  const created = res?.data ?? res;
  setTeam((prev) => [created, ...prev]);
  toast.success("Membre ajouté.");
  setShowTeamModal(false);
  resetNewMember();
} catch (err) {
  toast.error("Erreur ajout membre: " + (err.message || err));
}
};

const updateMember = async () => {
if (!editingMember?.id) return;
if (!editingMember.name.trim()) return toast.error("Nom requis.");
try {
  const payload = {
    name: editingMember.name.trim(),
    role: editingMember.role,
    phone: editingMember.phone || "",
    email: editingMember.email || "",
    isActive: !!editingMember.active,
  };
  const res = await apiFetch(`/team/${editingMember.id}`, { method: "PATCH", body: payload });
  const updated = res?.data ?? res;
  setTeam((prev) => prev.map((m) => (m.id === editingMember.id ? { ...m, ...updated } : m)));
  toast.success("Membre mis à jour.");
  setEditingMember(null);
} catch (err) {
  toast.error("Erreur mise à jour: " + (err.message || err));
}
};

const deleteMember = async (id) => {
try {
  await apiFetch(`/team/${id}`, { method: "DELETE" });
  setTeam((prev) => prev.filter((m) => m.id !== id));
  toast.success("Membre supprimé.");
} catch (err) {
  toast.error("Erreur suppression: " + (err.message || err));
}
};

/* ----------------------------
Actions - Planning
----------------------------- */
const addPlanningItem = async () => {
if (!planningForm.date) return toast.error("Date requise.");
const t = planningForm.type;
try {
if (t === "break") {
const res = await apiFetch("/planning/breaks", {
method: "POST",
body: {
date: planningForm.date,
start: planningForm.start,
end: planningForm.end,
label: planningForm.label || "Pause",
},
});
const created = normalizeBreak(res?.data ?? res);
setPlanning((p) => ({ ...p, breaks: [created, ...p.breaks] }));
toast.success("Pause ajoutée.");
}
if (t === "exception") {
const res = await apiFetch("/planning/exceptions", {
method: "POST",
body: {
date: planningForm.date,
open: planningForm.open,
close: planningForm.close,
closed: !!planningForm.closed,
},
});
const created = normalizeException(res?.data ?? res);
setPlanning((p) => ({ ...p, exceptions: [created, ...p.exceptions] }));
toast.success("Exception ajoutée.");
}
if (t === "holiday") {
const res = await apiFetch("/planning/holidays", {
method: "POST",
body: {
date: planningForm.date,
name: planningForm.name || "Jour férié",
},
});
const created = normalizeHoliday(res?.data ?? res);
setPlanning((p) => ({ ...p, holidays: [created, ...p.holidays] }));
toast.success("Jour férié ajouté.");
}
setShowPlanningModal(false);
} catch (err) {
toast.error(err.message || "Erreur lors de l'ajout");
}
};

const removePlanningItem = async (type, id) => {
try {
const endpoint =
type === "breaks"
? `/planning/breaks/${id}`
: type === "exceptions"
? `/planning/exceptions/${id}`
: `/planning/holidays/${id}`;
await apiFetch(endpoint, { method: "DELETE" });
setPlanning((p) => ({
...p,
[type]: p[type].filter((x) => x.id !== id),
}));
toast.success("Supprimé.");
} catch (err) {
toast.error(err.message || "Erreur lors de la suppression");
}
};

/* ----------------------------
Actions - Salon (portfolio)
----------------------------- */
const addPortfolioItem = async () => {
const title = portfolioForm.title.trim();
if (!title) return toast.error("Titre requis.");
if (portfolioForm.type === "gallery" && !portfolioForm.media && !portfolioForm.mediaFile)
return toast.error("Ajoute une photo/vidéo.");
if (
portfolioForm.type === "beforeAfter" &&
((!portfolioForm.beforeMedia && !portfolioForm.beforeFile) || (!portfolioForm.afterMedia && !portfolioForm.afterFile))
)
return toast.error("Ajoute AVANT et APRÈS.");

try {
  if (portfolioForm.type === "gallery") {
    const form = new FormData();
    form.append("caption", title);
    form.append("category", "gallery");
    if (portfolioForm.mediaFile) {
      form.append("image", portfolioForm.mediaFile);
    } else {
      form.append("url", portfolioForm.media);
    }
    const res = await apiFetch("/portfolio", { method: "POST", body: form });
    const createdRaw = res?.data ?? res;
    const created = normalizePortfolioList([createdRaw])[0];
    setPortfolio((p) => [created, ...p]);
  } else {
    const groupId = uuid("pf");
    const caption = `${title}||${groupId}`;
    const formBefore = new FormData();
    formBefore.append("caption", caption);
    formBefore.append("category", "before");
    if (portfolioForm.beforeFile) {
      formBefore.append("image", portfolioForm.beforeFile);
    } else {
      formBefore.append("url", portfolioForm.beforeMedia);
    }
    const resBefore = await apiFetch("/portfolio", { method: "POST", body: formBefore });
    const formAfter = new FormData();
    formAfter.append("caption", caption);
    formAfter.append("category", "after");
    if (portfolioForm.afterFile) {
      formAfter.append("image", portfolioForm.afterFile);
    } else {
      formAfter.append("url", portfolioForm.afterMedia);
    }
    const resAfter = await apiFetch("/portfolio", { method: "POST", body: formAfter });
    const beforeItem = resBefore?.data ?? resBefore;
    const afterItem = resAfter?.data ?? resAfter;
    const created = {
      id: groupId,
      type: "beforeAfter",
      title,
      beforeMedia: beforeItem.url || portfolioForm.beforeMedia,
      afterMedia: afterItem.url || portfolioForm.afterMedia,
      ids: [beforeItem.id, afterItem.id].filter(Boolean),
      createdAt: beforeItem.createdAt || Date.now(),
    };
    setPortfolio((p) => [created, ...p]);
  }
  toast.success("Ajouté au salon.");
  setShowPortfolioModal(false);
  setPortfolioForm({
    type: "gallery",
    title: "",
    media: "",
    mediaFile: null,
    beforeMedia: "",
    beforeFile: null,
    afterMedia: "",
    afterFile: null,
  });
} catch (err) {
  toast.error(err.message || "Erreur lors de l'ajout");
}
};

const removePortfolioItem = async (item) => {
const ids = Array.isArray(item?.ids) ? item.ids : [item?.id || item];
if (!ids[0]) return;
try {
  await Promise.all(ids.map((id) => apiFetch(`/portfolio/${id}`, { method: "DELETE" })));
  setPortfolio((p) => p.filter((x) => x.id !== (item?.id || item)));
  toast.success("Supprimé.");
} catch (err) {
  toast.error(err.message || "Erreur lors de la suppression");
}
};

/* ----------------------------
Actions - Reviews moderation
----------------------------- */
const setReviewStatus = async (id, status) => {
try {
  const res = await apiFetch(`/reviews/${id}`, { method: "PATCH", body: { status } });
  const updated = normalizeReview(res?.data ?? res);
  setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
  toast.success("Avis mis à jour.");
} catch (err) {
  toast.error(err.message || "Erreur lors de la mise à jour");
}
};

/* ----------------------------
Actions - Promos + loyalty
----------------------------- */
const addPromo = async () => {
const code = promoForm.code.trim().toUpperCase();
if (!code) return toast.error("Code requis.");
if (!promoForm.value || Number(promoForm.value) <= 0) return toast.error("Valeur invalide.");

try {
const payload = {
code,
type: promoForm.type === "amount" ? "fixed" : promoForm.type,
discount: Number(promoForm.value),
isActive: !!promoForm.active,
validTo: promoForm.expiresAt || null,
};
const res = await apiFetch("/promos", { method: "POST", body: payload });
const created = normalizePromo(res?.data ?? res);
setPromos((p) => [created, ...p]);
toast.success("Promo ajoutée.");
setShowPromoModal(false);
setPromoForm({ code: "", type: "percent", value: 10, expiresAt: "", active: true });
} catch (e) {
toast.error(e.message || "Erreur lors de l'ajout");
}
};

const togglePromo = async (id) => {
const current = promos.find((p) => p.id === id);
if (!current) return;
try {
const res = await apiFetch(`/promos/${id}`, {
method: "PATCH",
body: { isActive: !current.active },
});
const updated = normalizePromo(res?.data ?? res);
setPromos((p) => p.map((x) => (x.id === id ? updated : x)));
} catch (e) {
toast.error(e.message || "Erreur lors de la mise à jour");
}
};

const deletePromo = async (id) => {
try {
await apiFetch(`/promos/${id}`, { method: "DELETE" });
setPromos((p) => p.filter((x) => x.id !== id));
toast.success("Promo supprimée.");
} catch (e) {
toast.error(e.message || "Erreur lors de la suppression");
}
};
const saveLoyaltySettings = async () => {
try {
  const res = await apiFetch("/loyalty", { method: "PATCH", body: { settings: loyalty } });
  const settings = res?.settings || res?.data?.settings || loyalty;
  if (settings) setLoyalty(settings);
  toast.success("Fidélité sauvegardée.");
} catch (e) {
  toast.error(e.message || "Erreur lors de la sauvegarde");
}
};

/* ----------------------------
Actions - CRM
----------------------------- */
const markNoShow = async (clientId) => {
const current = clients.find((c) => c.id === clientId);
if (!current) return;
try {
  const nextCount = (current.noShowCount || 0) + 1;
  const res = await apiFetch(`/clients/${clientId}`, { method: "PATCH", body: { noShowCount: nextCount } });
  const updated = normalizeClient(res?.data ?? res);
  setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  if (selectedClient?.id === updated.id) setSelectedClient(updated);
  toast.success("No-show ajouté.");
} catch (err) {
  toast.error(err.message || "Erreur mise à jour no-show");
}
};

const updateClientNotes = (clientId, field, value) => {
setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, [field]: value } : c)));
};
const saveClientNotes = async () => {
if (!selectedClient?.id) return;
try {
  setSavingClientAddress(true);
  const res = await apiFetch(`/clients/${selectedClient.id}`, {
    method: "PATCH",
    body: { preferences: selectedClient.preferences || "", notes: selectedClient.notes || "" },
  });
  const updated = normalizeClient(res?.data ?? res);
  setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  setSelectedClient(updated);
  toast.success("Notes sauvegardées.");
} catch (e) {
  toast.error(e.message || "Erreur mise à jour notes");
} finally {
  setSavingClientAddress(false);
}
};

const saveClientAddress = async () => {
if (!selectedClient?.id) return;
try {
setSavingClientAddress(true);
const res = await apiFetch(`/clients/${selectedClient.id}`, {
method: "PATCH",
body: { address: clientAddressDraft },
});
const updated = normalizeClient(res?.data ?? res);
setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
setSelectedClient(updated);
setClientAddressDraft(updated.address || "");
toast.success("Adresse mise à jour.");
} catch (e) {
toast.error(e.message || "Erreur mise à jour adresse");
} finally {
setSavingClientAddress(false);
}
};

/* ----------------------------
Stats (API)
----------------------------- */
const fetchStats = async () => {
try {
const res = await apiFetch(`/stats?period=${statsPeriod}`);
const data = res?.data ?? res;
if (data) {
setStats((prev) => ({ ...prev, ...data }));
}
} catch (e) {
// Fallback on local appointments if API fails
const completed = appointments.filter((a) => a.status === "COMPLETED");
const cancelled = appointments.filter((a) => a.status === "CANCELLED");
const totalRevenue = completed.reduce((sum, a) => sum + (a.totalPrice || a.amount || 0), 0);
const averageTicket = completed.length ? Math.round(totalRevenue / completed.length) : 0;
const countsByService = new Map();
for (const a of appointments) {
const name = a.service?.name || a.serviceName || "Service";
countsByService.set(name, (countsByService.get(name) || 0) + 1);
}
const topServices = Array.from(countsByService.entries())
.sort((a, b) => b[1] - a[1])
.slice(0, 5);
setStats((prev) => ({
...prev,
totalRevenue,
totalBookings: appointments.length,
averageTicket,
cancelledBookings: cancelled.length,
completedBookings: completed.length,
topServices,
}));
}
};

useEffect(() => {
fetchStats();
}, [statsPeriod]);

const applySalonSettingsFromApi = (salon) => {
  if (!salon) return;
  const prefs = parseSalonPreferences(salon.salonSettings?.preferences);
  setSalonSettings((prev) => ({
    ...prev,
    name: salon.name ?? prev.name,
    phone: salon.phone ?? prev.phone,
    whatsapp: prefs.whatsapp ?? prev.whatsapp,
    address: salon.address ?? prev.address,
    description: salon.description ?? prev.description,
    image: salon.image ?? prev.image,
    openingHours: salon.openingHours ? openingHoursFromApi(salon.openingHours) : prev.openingHours,
  }));
};

const fetchSalonSettings = async () => {
  try {
    const res = await apiFetch("/salons/me");
    const data = res?.data ?? res;
    const salon = data?.salon ?? data;
    applySalonSettingsFromApi(salon);
  } catch (e) {
    toast.error("Erreur chargement paramètres: " + (e.message || e));
  }
};

const saveSettings = async () => {
  if (savingSettings) return;
  try {
    setSavingSettings(true);
    const safeImage =
      salonSettings.image && String(salonSettings.image).startsWith("data:")
        ? null
        : salonSettings.image || null;
    const payload = {
      name: salonSettings.name,
      phone: salonSettings.phone,
      whatsapp: salonSettings.whatsapp,
      address: salonSettings.address,
      description: salonSettings.description,
      image: safeImage,
      openingHours: openingHoursToApi(salonSettings.openingHours),
    };
    const res = await apiFetch("/salons/me", { method: "PATCH", body: payload });
    const data = res?.data ?? res;
    const salon = data?.salon ?? data;
    applySalonSettingsFromApi(salon);
    toast.success("Paramètres sauvegardés.");
  } catch (e) {
    toast.error(e.message || "Erreur lors de la sauvegarde");
  } finally {
    setSavingSettings(false);
  }
};

const salonName = salonSettings.name?.trim() || "Dashboard PRO";
const upcomingCount = appointments.filter((a) => a.status === "upcoming").length;
const completedCount = appointments.filter((a) => a.status === "completed").length;
const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;
const openFloatingChat = () => {
  const preferred =
    appointments.find((a) => {
      const status = String(a?.status || "").toLowerCase();
      return !["cancelled", "completed", "no_show"].includes(status);
    }) || appointments[0];
  setChatAppointment(preferred || null);
  setShowChatModal(true);
};

/* ----------------------------
Render
----------------------------- */
return (
<div className="min-h-screen bg-gray-50">
{/* subtle premium background */}
<div className="pointer-events-none fixed inset-0">
<div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-200/40 blur-3xl rounded-full" />
<div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-200/35 blur-3xl rounded-full" />
</div>

<div className="relative max-w-7xl mx-auto px-4 py-8">
	{/* Stat Cards Section */}
	<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
		<StatCard
			icon={<FiTrendingUp className="text-amber-500" />} 
			label="Revenus"
			value={formatMoney(stats.totalRevenue)}
			color="amber"
		/>
		<StatCard
			icon={<FiCalendar className="text-blue-500" />} 
			label="RDV"
			value={stats.totalBookings}
			color="blue"
		/>
		<StatCard
			icon={<FiCheck className="text-green-500" />} 
			label="Terminés"
			value={stats.completedBookings}
			color="green"
		/>
		<StatCard
			icon={<FiX className="text-red-500" />} 
			label="Annulés"
			value={stats.cancelledBookings}
			color="red"
		/>
	</div>
{/* Header */}
<Card className="p-6 mb-6 sticky top-4 z-10">
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
<div className="min-w-0">
<h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 truncate">
{salonName}
</h1>
<p className="text-sm text-gray-500 mt-1">
Gestion des RDV, services, Équipe, planning, paiements, salon, avis, promos, CRM et paramètres.
</p>
</div>

<div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
<Badge tone="blue">
<FiCalendar className="mr-2" /> À venir: {upcomingCount}
</Badge>
<Badge tone="green">
<FiCheck className="mr-2" /> Terminés: {completedCount}
</Badge>
<Badge tone="red">
<FiX className="mr-2" /> Annulés: {cancelledCount}
</Badge>
</div>
</div>

{/* Tabs */}
<div className="mt-6 flex flex-wrap gap-2">
{tabs.map((t) => {
const Icon = t.icon;
const active = activeTab === t.id;
return (
<button
key={t.id}
onClick={() => setActiveTab(t.id)}
className={cx(
"inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all",
active
? "bg-gray-900 text-white shadow-sm"
: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
)}
>
<Icon />
{t.label}
</button>
);
})}
</div>
</Card>

<AnimatePresence mode="sync">
{/* ------------------ APPOINTMENTS ------------------ */}
{activeTab === "appointments" && (
<motion.div key="appointments" {...pageAnim}>
<Card>
<CardHeader icon={<FiCalendar />} title="Rendez-vous" />
<div className="p-6">
<div className="mb-5 border border-gray-200 rounded-2xl p-4 bg-gray-50">
  <div className="flex items-center justify-between mb-3">
    <p className="font-semibold text-gray-900">Notifications</p>
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
        {unreadNotifications} non lues
      </span>
      <button
        type="button"
        onClick={markAllNotificationsRead}
        className="text-xs px-2 py-1 rounded-lg border border-gray-200 hover:bg-white"
      >
        Tout lire
      </button>
    </div>
  </div>
  {notifications.slice(0, 4).length === 0 ? (
    <p className="text-sm text-gray-500">Aucune notification.</p>
  ) : (
    <div className="space-y-2">
      {notifications.slice(0, 4).map((n) => (
        <div key={n.id} className={`text-sm rounded-xl px-3 py-2 ${n.isRead ? "bg-white text-gray-600" : "bg-amber-50 text-gray-800 border border-amber-100"}`}>
          <p>{n.message}</p>
          <p className="text-xs text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString("fr-FR")}</p>
        </div>
      ))}
    </div>
  )}
</div>
{loading ? (
<p className="text-gray-500 font-semibold">Chargement…</p>
) : appointments.length === 0 ? (
<EmptyState
icon={<FiCalendar />}
title="Aucun rendez-vous"
subtitle="Les réservations apparaîtront ici."
/>
) : (
<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
  {appointments.map((row, idx) => {
    const avatar = resolveMediaUrl(row.client?.picture || row.client?.avatar);
    const paymentTone =
      row.paymentStatus === "paid"
        ? "green"
        : row.paymentStatus === "deposit_paid"
        ? "blue"
        : row.paymentStatus === "refunded"
        ? "red"
        : row.paymentStatus === "pending_cash"
        ? "amber"
        : row.paymentStatus === "failed"
        ? "red"
        : "gray";
    const paymentLabel = getStatusLabel(row.paymentStatus);
    const statusTone =
      row.status === "completed"
        ? "green"
        : row.status === "cancelled"
        ? "red"
        : row.status === "confirmed" || row.status === "confirmed_on_site"
        ? "blue"
        : row.status === "pending" || row.status === "pending_assignment"
        ? "amber"
        : "gray";
    const statusLabel = getStatusLabel(row.status);

    return (
      <motion.div
        key={row.id || idx}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: idx * 0.03 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.55)] p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img
                src={avatar}
                alt={row.clientName}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center">
                {(row.clientName || "C").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{row.clientName}</p>
              <p className="text-xs text-gray-500">{row.client?.phoneNumber || row.client?.phone || ""}</p>
              {row.clientAddress ? <p className="text-xs text-gray-400">{row.clientAddress}</p> : null}
            </div>
          </div>
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <div>
            <p className="text-xs text-gray-500">Date</p>
            <p className="font-semibold text-gray-900">{formatDate(row.date)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Heure</p>
            <p className="font-semibold text-gray-900">{toTime(row.time) || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Service</p>
            <p className="font-semibold text-gray-900">{row.serviceName}</p>
            <p className="text-xs text-gray-500">{row.service?.duration ? `${row.service.duration} min` : ""}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Employé</p>
            <p className="font-semibold text-gray-900">{row.staffName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Paiement</p>
            <Badge tone={paymentTone}>{paymentLabel}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500">Montant</p>
            <p className="font-semibold text-gray-900">{formatMoney(row.amount)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Button
            variant="secondary"
            className="px-3 py-2"
            onClick={() => setAppointmentStatus(row.id, "completed")}
            disabled={row.status === "completed"}
          >
            <FiCheck className="mr-2" /> Terminer
          </Button>
          <Button
            variant="secondary"
            className="px-3 py-2"
            onClick={() => setAppointmentStatus(row.id, "cancelled")}
            disabled={row.status === "cancelled"}
          >
            <FiX className="mr-2" /> Annuler
          </Button>
          <Button
            variant="secondary"
            className="px-3 py-2"
            onClick={() => generateInvoiceForAppointment(row)}
          >
            <FiFileText className="mr-2" /> Facture
          </Button>
          <Button
            variant="secondary"
            className="px-3 py-2"
            onClick={() => refundAppointmentDeposit(row)}
          >
            <FiDollarSign className="mr-2" /> Rembourser
          </Button>
          <Button
            variant="secondary"
            className="px-3 py-2"
            onClick={() => {
              setChatAppointment(row);
              setShowChatModal(true);
            }}
          >
            <FiMessageCircle className="mr-2" /> Chat
          </Button>
        </div>
      </motion.div>
    );
  })}
</div>
)}
</div>
</Card>
</motion.div>
)}

{/* ------------------ SERVICES ------------------ */}
{activeTab === "services" && (
<motion.div key="services" {...pageAnim}>
<Card className="mb-6">
<CardHeader
icon={<FiScissors />}
title={`Services (${filteredServices.length})`}
right={
<Button onClick={() => setShowServiceModal(true)}>
<FiPlus className="mr-2" /> Ajouter
</Button>
}
/>
<div className="p-6">
<div className="grid md:grid-cols-12 gap-3 mb-5 items-end">
<div className="md:col-span-4">
<div className="relative">
<FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
<input
value={serviceQuery}
onChange={(e) => setServiceQuery(e.target.value)}
placeholder="Rechercher un service…"
className={cx(
"w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-2xl bg-white",
"focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
)}
/>
</div>
</div>

<div className="md:col-span-4">
<Select
label="Catégorie"
value={serviceCategory}
onChange={(e) => setServiceCategory(e.target.value)}
>
<option value="all">Toutes</option>
{serviceCategories.map((c) => (
<option key={c} value={c}>
{c}
</option>
))}
</Select>
</div>

<div className="md:col-span-4">
<Select label="Trier par" value={serviceSort} onChange={(e) => setServiceSort(e.target.value)}>
<option value="recent">Plus récents</option>
<option value="priceAsc">Prix ?</option>
<option value="priceDesc">Prix ?</option>
<option value="durationAsc">Durée ?</option>
<option value="durationDesc">Durée ?</option>
</Select>
</div>
</div>

{loading ? (
<p className="text-gray-500 font-semibold">Chargement…</p>
) : filteredServices.length === 0 ? (
<EmptyState
icon={<FiFilter />}
title="Aucun service"
subtitle="Change tes filtres ou ajoute un service."
action={
<Button onClick={() => setShowServiceModal(true)}>
<FiPlus className="mr-2" /> Ajouter un service
</Button>
}
/>
) : (
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
{filteredServices.map((service) => {
const mediaUrl = resolveMediaUrl(service.media);
return (
<div
key={service.id}
className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow"
>
<div className="mb-3">
{service.media ? (
isImage(mediaUrl) ? (
<img src={mediaUrl} alt="aperçu" className="w-full h-64 object-cover rounded-2xl" />
) : isVideo(mediaUrl) ? (
<video src={mediaUrl} controls className="w-full h-64 object-cover rounded-2xl" />
) : (
<div className="w-full h-64 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
<FiImage className="w-8 h-8 text-gray-300" />
</div>
)
) : (
<div className="w-full h-64 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
<FiImage className="w-8 h-8 text-gray-300" />
</div>
)}
</div>

<div className="flex items-start justify-between gap-2">
<div className="min-w-0">
<Badge tone="amber">{service.category}</Badge>
<h4 className="mt-2 text-base font-extrabold text-gray-900 truncate">
{service.name}
</h4>
{service.description ? (
<p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>
) : null}
</div>

<div className="flex gap-2">
<IconButton
title="Modifier"
                onClick={() => {
                  const mediaList =
                    Array.isArray(service.images) && service.images.length
                      ? service.images
                      : service.media
                      ? [service.media]
                      : [];
                  setEditingService({
                    ...service,
                    mediaList,
                    mediaFiles: mediaList.map(() => null),
                  });
                }}
>
<FiEdit2 />
</IconButton>
<IconButton title="Supprimer" onClick={() => setConfirmDelete(service)}>
<FiTrash2 />
</IconButton>
</div>
</div>

<div className="flex items-center justify-between mt-4">
<span className="flex items-center text-sm text-gray-500 font-semibold">
<FiClock className="mr-1" />
{service.duration} min
</span>
<span className="text-lg font-extrabold text-gray-900">{formatMoney(service.price)}</span>
</div>

<div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
<span className="text-xs text-gray-500 font-semibold">
Acompte : {service.depositPercentage ?? 30}%
</span>
{service.depositPercentage > 0 ? (
<Badge tone="blue">Paiement partiel</Badge>
) : (
<Badge tone="gray">Sans acompte</Badge>
)}
</div>
</div>
);
})}
</div>
)}
</div>
</Card>

{/* Add service modal */}
<Modal
open={showServiceModal}
title="Nouveau service"
onClose={() => {
setShowServiceModal(false);
resetNewService();
}}
footer={
<div className="flex gap-3 justify-end">
<Button
variant="secondary"
onClick={() => {
setShowServiceModal(false);
resetNewService();
}}
>
Annuler
</Button>
<Button onClick={handleAddService}>
<FiPlus className="mr-2" /> Ajouter
</Button>
</div>
}
>
<div className="space-y-4">
<div>
<label className="block text-sm font-semibold text-gray-700 mb-1">Photos du service</label>
<input
ref={fileInputRef}
type="file"
accept="image/*,video/*"
multiple
onChange={(e) => {
const files = e.target.files;
if (!files || files.length === 0) return;
appendServiceMedia(files, setNewService);
e.target.value = "";
}}
className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl"
/>
{newService.mediaList && newService.mediaList.length ? (
<div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
{newService.mediaList.map((item, idx) => (
<div key={`${item}-${idx}`} className="relative group">
{isImage(resolveMediaUrl(item)) ? (
<img src={resolveMediaUrl(item)} alt="preview" className="w-full h-24 object-cover rounded-2xl border border-gray-100" />
) : (
<video src={resolveMediaUrl(item)} className="w-full h-24 object-cover rounded-2xl border border-gray-100" />
)}
<div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button
type="button"
onClick={() => setServiceCover(idx, setNewService)}
className="px-2 py-1 text-[10px] font-semibold rounded-full bg-white/90 shadow"
>
Couverture
</button>
<button
type="button"
onClick={() => removeServiceMediaAt(idx, setNewService)}
className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center text-xs"
>
×
</button>
</div>
{idx === 0 && (
<span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500 text-white shadow">
Couverture
</span>
)}
</div>
))}
</div>
) : (
<p className="text-xs text-gray-500 mt-2">
Max {MAX_MEDIA_MB}MB par fichier – jusqu’à {MAX_SERVICE_MEDIA} photos
</p>
)}
</div>

<Input
label="Nom du service *"
placeholder="Ex: Tresses africaines"
value={newService.name}
onChange={(e) => setNewService((p) => ({ ...p, name: e.target.value }))}
/>

<Select
label="Catégorie"
value={newService.category}
onChange={(e) => setNewService((p) => ({ ...p, category: e.target.value }))}
>
{serviceCategories.map((cat) => (
<option key={cat} value={cat}>
{cat}
</option>
))}
</Select>

<Textarea
label="Description"
rows={3}
placeholder="Description optionnelle…"
value={newService.description}
onChange={(e) => setNewService((p) => ({ ...p, description: e.target.value }))}
/>

<div className="grid grid-cols-2 gap-4">
<Input
label="Prix (FCFA) *"
type="number"
placeholder="15000"
value={newService.price}
onChange={(e) => setNewService((p) => ({ ...p, price: e.target.value }))}
/>
<Select
label="Durée"
value={newService.duration}
onChange={(e) => setNewService((p) => ({ ...p, duration: Number(e.target.value) }))}
>
{[15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360].map((d) => (
<option key={d} value={d}>
{d} min
</option>
))}
</Select>
</div>

<Select
label="Acompte requis (%)"
value={newService.depositPercentage}
onChange={(e) => setNewService((p) => ({ ...p, depositPercentage: Number(e.target.value) }))}
>
{[0, 10, 20, 25, 30, 40, 50].map((p) => (
<option key={p} value={p}>
{p}%
</option>
))}
</Select>
</div>
</Modal>

{/* Edit service modal */}
<Modal
open={!!editingService}
title="Modifier le service"
onClose={() => setEditingService(null)}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setEditingService(null)}>
Annuler
</Button>
<Button onClick={handleUpdateService}>
<FiSave className="mr-2" /> Sauvegarder
</Button>
</div>
}
>
{editingService ? (
<div className="space-y-4">
<div>
<label className="block text-sm font-semibold text-gray-700 mb-1">Photos du service</label>
<input
type="file"
accept="image/*,video/*"
multiple
onChange={(e) => {
const files = e.target.files;
if (!files || files.length === 0) return;
appendServiceMedia(files, setEditingService);
e.target.value = "";
}}
className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl"
/>
{editingService.mediaList && editingService.mediaList.length ? (
<div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
{editingService.mediaList.map((item, idx) => (
<div key={`${item}-${idx}`} className="relative group">
{isImage(resolveMediaUrl(item)) ? (
<img src={resolveMediaUrl(item)} alt="preview" className="w-full h-24 object-cover rounded-2xl border border-gray-100" />
) : (
<video src={resolveMediaUrl(item)} className="w-full h-24 object-cover rounded-2xl border border-gray-100" />
)}
<div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
<button
type="button"
onClick={() => setServiceCover(idx, setEditingService)}
className="px-2 py-1 text-[10px] font-semibold rounded-full bg-white/90 shadow"
>
Couverture
</button>
<button
type="button"
onClick={() => removeServiceMediaAt(idx, setEditingService)}
className="w-7 h-7 rounded-full bg-white/90 shadow flex items-center justify-center text-xs"
>
×
</button>
</div>
{idx === 0 && (
<span className="absolute bottom-2 left-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500 text-white shadow">
Couverture
</span>
)}
</div>
))}
</div>
) : (
<p className="text-xs text-gray-500 mt-2">
Max {MAX_MEDIA_MB}MB par fichier – jusqu’à {MAX_SERVICE_MEDIA} photos
</p>
)}
</div>

<Input label="Nom *" value={editingService.name || ""} onChange={(e) => setEditingService((p) => ({ ...p, name: e.target.value }))} />

<Select
label="Catégorie"
value={editingService.category || serviceCategories[0]}
onChange={(e) => setEditingService((p) => ({ ...p, category: e.target.value }))}
>
{serviceCategories.map((cat) => (
<option key={cat} value={cat}>
{cat}
</option>
))}
</Select>

<Textarea
label="Description"
rows={3}
value={editingService.description || ""}
onChange={(e) => setEditingService((p) => ({ ...p, description: e.target.value }))}
/>

<div className="grid grid-cols-2 gap-4">
<Input
label="Prix (FCFA) *"
type="number"
value={editingService.price ?? ""}
onChange={(e) => setEditingService((p) => ({ ...p, price: Number(e.target.value) }))}
/>
<Select
label="Durée"
value={editingService.duration ?? 30}
onChange={(e) => setEditingService((p) => ({ ...p, duration: Number(e.target.value) }))}
>
{[15, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360].map((d) => (
<option key={d} value={d}>
{d} min
</option>
))}
</Select>
</div>

<Select
label="Acompte (%)"
value={editingService.depositPercentage ?? 30}
onChange={(e) => setEditingService((p) => ({ ...p, depositPercentage: Number(e.target.value) }))}
>
{[0, 10, 20, 25, 30, 40, 50].map((p) => (
<option key={p} value={p}>
{p}%
</option>
))}
</Select>
</div>
) : null}
</Modal>

{/* Confirm delete modal */}
<Modal
open={!!confirmDelete}
title="Confirmer la suppression"
onClose={() => setConfirmDelete(null)}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setConfirmDelete(null)}>
Annuler
</Button>
<Button variant="danger" onClick={confirmDeleteService}>
<FiTrash2 className="mr-2" /> Supprimer
</Button>
</div>
}
>
<div className="flex items-start gap-3">
<div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600">
<FiAlertTriangle className="text-xl" />
</div>
<div>
<p className="font-extrabold text-gray-900">Supprimer "{confirmDelete?.name}" ?</p>
<p className="text-sm text-gray-500 mt-1">Cette action est irréversible.</p>
</div>
</div>
</Modal>
</motion.div>
)}

{/* ------------------ TEAM ------------------ */}
{activeTab === "team" && (
<motion.div key="team" {...pageAnim}>
<Card>
<CardHeader
icon={<FiUsers />}
title="Équipe"
right={
<Button onClick={() => setShowTeamModal(true)}>
<FiPlus className="mr-2" /> Ajouter
</Button>
}
/>
<div className="p-6">
{loading ? (
<p className="text-gray-500 font-semibold">Chargement…</p>
) : team.length === 0 ? (
<EmptyState icon={<FiUsers />} title="Aucun employé" subtitle="Ajoutez les membres de votre Équipe." />
) : (
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
{team.map((m) => {
const avatar = resolveMediaUrl(m.picture || m.avatar || m.photo);
return (
<div
key={m.id}
className="relative overflow-hidden bg-white/90 border border-gray-100 rounded-3xl p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.6)] hover:shadow-lg transition-shadow"
>
<div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-100/60 rounded-full blur-2xl" />
<div className="h-1 w-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 mb-4" />
<div className="flex items-start gap-4">
{avatar ? (
<img
src={avatar}
alt={m.name}
className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow"
/>
) : (
<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-extrabold">
{getInitials(m.name)}
</div>
)}
<div className="flex-1 min-w-0">
<div className="flex items-start justify-between gap-3">
<div className="min-w-0">
<h4 className="text-base font-extrabold text-gray-900 truncate">{m.name}</h4>
{m.email ? <p className="text-xs text-gray-500 mt-1 truncate">{m.email}</p> : null}
{m.phone ? <p className="text-sm text-gray-500 mt-1">{m.phone}</p> : null}
</div>
<div className="flex gap-2">
<IconButton title="Modifier" onClick={() => setEditingMember({ ...m })}>
<FiEdit2 />
</IconButton>
<IconButton title="Supprimer" onClick={() => deleteMember(m.id)}>
<FiTrash2 />
</IconButton>
</div>
</div>
<div className="mt-3 flex gap-2 items-center flex-wrap">
<Badge tone="purple">{m.role}</Badge>
{m.active ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Inactif</Badge>}
</div>
</div>
</div>

<div className="mt-4 pt-4 border-t border-gray-100">
<p className="text-xs font-extrabold text-gray-700 mb-2">Disponibilités</p>
<div className="space-y-1.5">
{weekDays.map(([label, key]) => {
const h = m.availability?.[key];
return (
<div key={key} className="flex items-center justify-between text-xs">
<span className="font-semibold text-gray-700">{label}</span>
<span className="text-gray-500">{h ? `${h.open} - ${h.close}` : "Fermé"}</span>
</div>
);
})}
</div>
</div>
</div>
);
})}
</div>
)}
</div>
</Card>

{/* Add member modal */}
<Modal
open={showTeamModal}
title="Ajouter un employé"
onClose={() => {
setShowTeamModal(false);
resetNewMember();
}}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setShowTeamModal(false)}>
Annuler
</Button>
<Button onClick={addMember}>
<FiPlus className="mr-2" /> Ajouter
</Button>
</div>
}
>
<div className="space-y-4">
<Input label="Nom *" value={newMember.name} onChange={(e) => setNewMember((p) => ({ ...p, name: e.target.value }))} />
<Select label="Rôle" value={newMember.role} onChange={(e) => setNewMember((p) => ({ ...p, role: e.target.value }))}>
{roles.map((r) => (
<option key={r} value={r}>
{r}
</option>
))}
</Select>
<Input label="Téléphone" value={newMember.phone} onChange={(e) => setNewMember((p) => ({ ...p, phone: e.target.value }))} />

<div className="flex items-center gap-2">
<input type="checkbox" checked={newMember.active} onChange={(e) => setNewMember((p) => ({ ...p, active: e.target.checked }))} />
<span className="text-sm font-semibold text-gray-700">Actif</span>
</div>

<div className="pt-2">
<p className="text-sm font-extrabold text-gray-900 mb-2">Disponibilités</p>
<div className="space-y-3">
{weekDays.map(([label, key]) => {
const h = newMember.availability[key];
return (
<div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
<span className="w-24 font-extrabold text-gray-900 text-sm">{label}</span>
{h ? (
<>
<input
type="time"
value={h.open}
onChange={(e) =>
setNewMember((p) => ({
...p,
availability: { ...p.availability, [key]: { ...h, open: e.target.value } },
}))
}
className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
/>
<span className="text-gray-500 font-semibold">—</span>
<input
type="time"
value={h.close}
onChange={(e) =>
setNewMember((p) => ({
...p,
availability: { ...p.availability, [key]: { ...h, close: e.target.value } },
}))
}
className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
/>
<button
onClick={() =>
setNewMember((p) => ({
...p,
availability: { ...p.availability, [key]: null },
}))
}
className="text-red-600 hover:text-red-700 font-semibold text-sm"
>
Fermé
</button>
</>
) : (
<button
onClick={() =>
setNewMember((p) => ({
...p,
availability: { ...p.availability, [key]: { open: "09:00", close: "18:00" } },
}))
}
className="text-amber-700 hover:text-amber-800 font-semibold text-sm"
>
Ajouter horaires
</button>
)}
</div>
);
})}
</div>
</div>
</div>
</Modal>

{/* Edit member modal */}
<Modal
open={!!editingMember}
title="Modifier employé"
onClose={() => setEditingMember(null)}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setEditingMember(null)}>
Annuler
</Button>
<Button onClick={updateMember}>
<FiSave className="mr-2" /> Sauvegarder
</Button>
</div>
}
>
{editingMember ? (
<div className="space-y-4">
<Input label="Nom *" value={editingMember.name} onChange={(e) => setEditingMember((p) => ({ ...p, name: e.target.value }))} />
<Select label="Rôle" value={editingMember.role} onChange={(e) => setEditingMember((p) => ({ ...p, role: e.target.value }))}>
{roles.map((r) => (
<option key={r} value={r}>
{r}
</option>
))}
</Select>
<Input label="Téléphone" value={editingMember.phone || ""} onChange={(e) => setEditingMember((p) => ({ ...p, phone: e.target.value }))} />

<div className="flex items-center gap-2">
<input type="checkbox" checked={!!editingMember.active} onChange={(e) => setEditingMember((p) => ({ ...p, active: e.target.checked }))} />
<span className="text-sm font-semibold text-gray-700">Actif</span>
</div>

<div className="pt-2">
<p className="text-sm font-extrabold text-gray-900 mb-2">Disponibilités</p>
<div className="space-y-3">
{weekDays.map(([label, key]) => {
const h = editingMember.availability?.[key] || null;
return (
<div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
<span className="w-24 font-extrabold text-gray-900 text-sm">{label}</span>
{h ? (
<>
<input
type="time"
value={h.open}
onChange={(e) =>
setEditingMember((p) => ({
...p,
availability: { ...p.availability, [key]: { ...h, open: e.target.value } },
}))
}
className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
/>
<span className="text-gray-500 font-semibold">—</span>
<input
type="time"
value={h.close}
onChange={(e) =>
setEditingMember((p) => ({
...p,
availability: { ...p.availability, [key]: { ...h, close: e.target.value } },
}))
}
className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
/>
<button
onClick={() =>
setEditingMember((p) => ({
...p,
availability: { ...p.availability, [key]: null },
}))
}
className="text-red-600 hover:text-red-700 font-semibold text-sm"
>
Fermé
</button>
</>
) : (
<button
onClick={() =>
setEditingMember((p) => ({
...p,
availability: { ...p.availability, [key]: { open: "09:00", close: "18:00" } },
}))
}
className="text-amber-700 hover:text-amber-800 font-semibold text-sm"
>
Ajouter horaires
</button>
)}
</div>
);
})}
</div>
</div>
</div>
) : null}
</Modal>
</motion.div>
)}

{/* ------------------ PLANNING ------------------ */}
{activeTab === "planning" && (
<motion.div key="planning" {...pageAnim}>
<Card>
<CardHeader
icon={<FiClock />}
title="Planning"
right={
<Button onClick={() => setShowPlanningModal(true)}>
<FiPlus className="mr-2" /> Ajouter
</Button>
}
/>
<div className="p-6 space-y-6">
<div className="grid lg:grid-cols-3 gap-4">
<Card className="p-5">
<h4 className="font-extrabold text-gray-900 mb-3">Pauses</h4>
{planning.breaks.length === 0 ? (
<p className="text-sm text-gray-500">Aucune pause.</p>
) : (
<div className="space-y-2">
{planning.breaks.map((b) => (
<div key={b.id} className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between">
<div>
<p className="text-sm font-extrabold text-gray-900">{b.label}</p>
<p className="text-xs text-gray-500">{b.date} à {b.start}-{b.end}</p>
</div>
<IconButton title="Supprimer" onClick={() => removePlanningItem("breaks", b.id)}>
<FiTrash2 />
</IconButton>
</div>
))}
</div>
)}
</Card>

<Card className="p-5">
<h4 className="font-extrabold text-gray-900 mb-3">Exceptions</h4>
{planning.exceptions.length === 0 ? (
<p className="text-sm text-gray-500">Aucune exception.</p>
) : (
<div className="space-y-2">
{planning.exceptions.map((ex) => (
<div key={ex.id} className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between">
<div>
<p className="text-sm font-extrabold text-gray-900">{ex.date}</p>
<p className="text-xs text-gray-500">{ex.closed ? "Fermé" : `${ex.open}-${ex.close}`}</p>
</div>
<IconButton title="Supprimer" onClick={() => removePlanningItem("exceptions", ex.id)}>
<FiTrash2 />
</IconButton>
</div>
))}
</div>
)}
</Card>

<Card className="p-5">
<h4 className="font-extrabold text-gray-900 mb-3">Jours fériés</h4>
{planning.holidays.length === 0 ? (
<p className="text-sm text-gray-500">Aucun jour férié.</p>
) : (
<div className="space-y-2">
{planning.holidays.map((h) => (
<div key={h.id} className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between">
<div>
<p className="text-sm font-extrabold text-gray-900">{h.name}</p>
<p className="text-xs text-gray-500">{h.date}</p>
</div>
<IconButton title="Supprimer" onClick={() => removePlanningItem("holidays", h.id)}>
<FiTrash2 />
</IconButton>
</div>
))}
</div>
)}
</Card>
</div>
</div>
</Card>

<Modal
open={showPlanningModal}
title="Ajouter au planning"
onClose={() => setShowPlanningModal(false)}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setShowPlanningModal(false)}>
Annuler
</Button>
<Button onClick={addPlanningItem}>
<FiPlus className="mr-2" /> Ajouter
</Button>
</div>
}
>
<div className="space-y-4">
<Select label="Type" value={planningForm.type} onChange={(e) => setPlanningForm((p) => ({ ...p, type: e.target.value }))}>
<option value="break">Pause</option>
<option value="exception">Exception</option>
<option value="holiday">Jour férié</option>
</Select>

<Input label="Date *" type="date" value={planningForm.date} onChange={(e) => setPlanningForm((p) => ({ ...p, date: e.target.value }))} />

{planningForm.type === "break" && (
<>
<Input label="Libellé" value={planningForm.label} onChange={(e) => setPlanningForm((p) => ({ ...p, label: e.target.value }))} />
<div className="grid grid-cols-2 gap-4">
<Input label="Début" type="time" value={planningForm.start} onChange={(e) => setPlanningForm((p) => ({ ...p, start: e.target.value }))} />
<Input label="Fin" type="time" value={planningForm.end} onChange={(e) => setPlanningForm((p) => ({ ...p, end: e.target.value }))} />
</div>
</>
)}

{planningForm.type === "exception" && (
<>
<div className="flex items-center gap-2">
<input type="checkbox" checked={planningForm.closed} onChange={(e) => setPlanningForm((p) => ({ ...p, closed: e.target.checked }))} />
<span className="text-sm font-semibold text-gray-700">Fermé ce jour</span>
</div>
{!planningForm.closed ? (
<div className="grid grid-cols-2 gap-4">
<Input label="Ouverture" type="time" value={planningForm.open} onChange={(e) => setPlanningForm((p) => ({ ...p, open: e.target.value }))} />
<Input label="Fermeture" type="time" value={planningForm.close} onChange={(e) => setPlanningForm((p) => ({ ...p, close: e.target.value }))} />
</div>
) : null}
</>
)}

{planningForm.type === "holiday" && (
<Input label="Nom" value={planningForm.name} onChange={(e) => setPlanningForm((p) => ({ ...p, name: e.target.value }))} />
)}
</div>
</Modal>
</motion.div>
)}

{/* ------------------ PAYMENTS ------------------ */}
{activeTab === "payments" && (
<motion.div key="payments" {...pageAnim}>
<Card>
<CardHeader icon={<FiDollarSign />} title="Paiements" />
<div className="p-6">
{/* ? petit fix: afficher payments si dispo, sinon fallback appointments (tu ne perds aucune donnée) */}
<DataTable
emptyLabel="Aucun paiement"
columns={[
{ key: "clientName", label: "Client" },
{ key: "serviceName", label: "Service" },
{ key: "amount", label: "Total", render: (r) => <span className="font-extrabold">{formatMoney(r.amount)}</span> },
{
key: "deposit",
label: "Acompte",
render: (r) => {
const dep = Math.round((r.amount * (r.depositPct || 0)) / 100);
return (
<div className="flex items-center gap-2">
<Badge tone={r.depositPaid ? "blue" : "gray"}>{r.depositPct || 0}%</Badge>
<span className="text-sm text-gray-700 font-semibold">{formatMoney(dep)}</span>
</div>
);
},
},
{
key: "paymentStatus",
label: "Statut",
render: (r) => {
const tone =
r.paymentStatus === "paid"
? "green"
: r.paymentStatus === "deposit_paid"
? "blue"
: r.paymentStatus === "refunded"
? "red"
: "gray";
const label = getStatusLabel(r.paymentStatus);
return <Badge tone={tone}>{label}</Badge>;
},
},
{
key: "actions",
label: "Actions",
render: (r) => (
<div className="flex gap-2 flex-wrap">
<Button variant="secondary" className="px-3 py-2" onClick={() => generateInvoiceForAppointment(r)}>
<FiFileText className="mr-2" /> Facture
</Button>
<Button variant="secondary" className="px-3 py-2" onClick={() => refundAppointmentDeposit(r)}>
<FiDollarSign className="mr-2" /> Rembourser
</Button>
</div>
),
},
]}
data={payments.length ? payments : appointments}
/>
</div>
</Card>
</motion.div>
)}

{/* ------------------ PAYMENT METHODS ------------------ */}
{activeTab === "paymentMethods" && (
<motion.div key="paymentMethods" {...pageAnim}>
<Card>
<CardHeader icon={<FiCreditCard />} title="Moyens de paiement du salon" right={null} />
<div className="p-6">
{loadingPaymentMethods ? (
<p className="text-gray-500 font-semibold">Chargement…</p>
) : paymentMethods.length === 0 ? (
<EmptyState
icon={<FiCreditCard />}
title="Aucun moyen de paiement"
subtitle="Configurez les moyens de paiement acceptés par votre salon."
action={
<Button onClick={() => setShowPaymentMethodModal(true)}>
<FiPlus className="mr-2" /> Ajouter un moyen de paiement
</Button>
}
/>
) : (
<>
<div className="mb-4 flex justify-end">
<Button onClick={() => setShowPaymentMethodModal(true)}>
<FiPlus className="mr-2" /> Ajouter un moyen de paiement
</Button>
</div>
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
{paymentMethods.map((pm) => (
<div
key={pm.id}
className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex items-center gap-4"
>
<FiCreditCard className="w-8 h-8 text-amber-500" />
<div className="flex-1">
<div className="font-bold text-gray-900 text-base">{pm.method}</div>
<div className="text-xs text-gray-500">{pm.enabled ? "Activé" : "Désactivé"}</div>
</div>
<div className="flex items-center gap-2">
<Badge tone={pm.enabled ? "green" : "gray"}>{pm.enabled ? "OK" : "OFF"}</Badge>
<IconButton title="Supprimer" onClick={() => setConfirmPaymentMethod(pm)}>
<FiTrash2 />
</IconButton>
</div>
</div>
))}
</div>
</>
)}
</div>
</Card>

<Modal
open={showPaymentMethodModal}
title="Ajouter un moyen de paiement"
onClose={() => setShowPaymentMethodModal(false)}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setShowPaymentMethodModal(false)}>
Annuler
</Button>
<Button onClick={handleAddPaymentMethod}>
<FiPlus className="mr-2" /> Ajouter
</Button>
</div>
}
>
<div className="space-y-4">
<Input
label="Nom du moyen de paiement"
value={newPaymentMethod.method}
onChange={(e) => setNewPaymentMethod((p) => ({ ...p, method: e.target.value }))}
placeholder="Ex: Orange Money, Wave, Espèces..."
/>
<Select
label="Statut"
value={newPaymentMethod.enabled ? "1" : "0"}
onChange={(e) => setNewPaymentMethod((p) => ({ ...p, enabled: e.target.value === "1" }))}
>
<option value="1">Activé</option>
<option value="0">Désactivé</option>
</Select>
</div>
</Modal>
</motion.div>
)}

<Modal
open={!!confirmPaymentMethod}
title="Supprimer le moyen de paiement"
onClose={() => setConfirmPaymentMethod(null)}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setConfirmPaymentMethod(null)} disabled={deletingPaymentMethod}>
Annuler
</Button>
<Button onClick={() => handleDeletePaymentMethod(confirmPaymentMethod?.id)} disabled={deletingPaymentMethod}>
Supprimer
</Button>
</div>
}
>
<div className="space-y-3">
<div className="flex items-start gap-3">
<span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600">
<FiAlertTriangle />
</span>
<div>
<p className="font-semibold text-gray-900">Cette action est définitive.</p>
<p className="text-sm text-gray-500">
Voulez-vous vraiment supprimer le moyen de paiement{" "}
<span className="font-semibold text-gray-700">{confirmPaymentMethod?.method}</span> ?
</p>
</div>
</div>
</div>
</Modal>

{/* ------------------ SALON (id = "portfolio") ------------------ */}
{activeTab === "portfolio" && (
<motion.div key="portfolio" {...pageAnim}>
<Card>
<CardHeader
icon={<FiCamera />}
title="Salon"
subtitle="Photos / vidéos + avant / après"
right={
<Button onClick={() => setShowPortfolioModal(true)}>
<FiPlus className="mr-2" /> Ajouter
</Button>
}
/>
<div className="p-6">
{portfolio.length === 0 ? (
<EmptyState icon={<FiCamera />} title="Salon vide" subtitle="Ajoute des photos ou des avant/après." />
) : (
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
{portfolio.map((p) => {
const mediaUrl = resolveMediaUrl(p.media);
const beforeUrl = resolveMediaUrl(p.beforeMedia);
const afterUrl = resolveMediaUrl(p.afterMedia);
return (
<div key={p.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
<div className="flex items-start justify-between gap-2">
<div className="min-w-0">
<Badge tone="purple">{p.type === "beforeAfter" ? "Avant/Après" : "Galerie"}</Badge>
<h4 className="mt-2 text-base font-extrabold text-gray-900 truncate">{p.title}</h4>
<p className="text-xs text-gray-500 mt-1">{formatDate(p.createdAt)}</p>
</div>
<IconButton title="Supprimer" onClick={() => removePortfolioItem(p)}>
<FiTrash2 />
</IconButton>
</div>

<div className="mt-3">
{p.type === "gallery" ? (
p.media ? (
isImage(mediaUrl) ? (
<img src={mediaUrl} alt="salon" className="w-full h-44 object-cover rounded-2xl" />
) : (
<video src={mediaUrl} controls className="w-full h-44 object-cover rounded-2xl" />
)
) : (
<div className="w-full h-44 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
<FiImage className="w-8 h-8 text-gray-300" />
</div>
)
) : (
<div className="grid grid-cols-2 gap-3">
<div>
<p className="text-xs font-extrabold text-gray-700 mb-2">Avant</p>
{p.beforeMedia ? (
isImage(beforeUrl) ? (
<img src={beforeUrl} alt="avant" className="w-full h-44 object-cover rounded-2xl" />
) : (
<video src={beforeUrl} controls className="w-full h-44 object-cover rounded-2xl" />
)
) : (
<div className="w-full h-44 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
<FiImage className="w-6 h-6 text-gray-300" />
</div>
)}
</div>
<div>
<p className="text-xs font-extrabold text-gray-700 mb-2">Après</p>
{p.afterMedia ? (
isImage(afterUrl) ? (
<img src={afterUrl} alt="après" className="w-full h-44 object-cover rounded-2xl" />
) : (
<video src={afterUrl} controls className="w-full h-44 object-cover rounded-2xl" />
)
) : (
<div className="w-full h-44 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
<FiImage className="w-6 h-6 text-gray-300" />
</div>
)}
</div>
</div>
)}
</div>
</div>
);
})}
</div>
)}
</div>
</Card>

<Modal
open={showPortfolioModal}
title="Ajouter au salon"
onClose={() => setShowPortfolioModal(false)}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setShowPortfolioModal(false)}>
Annuler
</Button>
<Button onClick={addPortfolioItem}>
<FiPlus className="mr-2" /> Ajouter
</Button>
</div>
}
>
<div className="space-y-4">
<Select
label="Type"
value={portfolioForm.type}
onChange={(e) => setPortfolioForm((p) => ({ ...p, type: e.target.value }))}
>
<option value="gallery">Galerie</option>
<option value="beforeAfter">Avant/Après</option>
</Select>

<Input
label="Titre *"
value={portfolioForm.title}
onChange={(e) => setPortfolioForm((p) => ({ ...p, title: e.target.value }))}
/>

{portfolioForm.type === "gallery" ? (
<div>
<label className="block text-sm font-semibold text-gray-700 mb-1">Photo/vidéo *</label>
<input
type="file"
accept="image/*,video/*"
onChange={(e) => {
const file = e.target.files?.[0];
if (!file) return;
if (!validateMedia(file)) return;
readMediaAsDataUrl(file, (dataUrl) => setPortfolioForm((p) => ({ ...p, media: dataUrl, mediaFile: file })));
}}
className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl"
/>
</div>
) : (
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-semibold text-gray-700 mb-1">Avant *</label>
<input
type="file"
accept="image/*,video/*"
onChange={(e) => {
const file = e.target.files?.[0];
if (!file) return;
if (!validateMedia(file)) return;
readMediaAsDataUrl(file, (dataUrl) => setPortfolioForm((p) => ({ ...p, beforeMedia: dataUrl, beforeFile: file })));
}}
className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl"
/>
</div>
<div>
<label className="block text-sm font-semibold text-gray-700 mb-1">Après *</label>
<input
type="file"
accept="image/*,video/*"
onChange={(e) => {
const file = e.target.files?.[0];
if (!file) return;
if (!validateMedia(file)) return;
readMediaAsDataUrl(file, (dataUrl) => setPortfolioForm((p) => ({ ...p, afterMedia: dataUrl, afterFile: file })));
}}
className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl"
/>
</div>
</div>
)}
</div>
</Modal>
</motion.div>
)}

{/* ------------------ REVIEWS ------------------ */}
{activeTab === "reviews" && (
<motion.div key="reviews" {...pageAnim}>
<Card>
<CardHeader
icon={<FiStar />}
title="Avis clients"
right={
<Select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}>
<option value="all">Tous</option>
<option value="pending">En attente</option>
<option value="approved">Approuvés</option>
<option value="rejected">Rejetés</option>
</Select>
}
/>
<div className="p-6">
{filteredReviews.length === 0 ? (
<EmptyState icon={<FiStar />} title="Aucun avis" subtitle="Les avis apparaîtront ici." />
) : (
<div className="space-y-3">
{filteredReviews.map((r) => (
<div key={r.id} className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm">
<div className="flex items-start justify-between gap-3">
<div>
<div className="flex items-center gap-2 flex-wrap">
<span className="font-extrabold text-gray-900">{r.clientName}</span>
<Badge tone="amber">? {r.rating}/5</Badge>
<Badge tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "blue"}>
{getStatusLabel(r.status)}
</Badge>
</div>
<p className="text-sm text-gray-600 mt-2">{r.comment}</p>
<p className="text-xs text-gray-400 mt-2">{formatDate(r.createdAt)}</p>
</div>
<div className="flex gap-2">
<Button variant="secondary" className="px-3 py-2" onClick={() => setReviewStatus(r.id, "approved")}>
<FiCheck className="mr-2" /> Approuver
</Button>
<Button variant="secondary" className="px-3 py-2" onClick={() => setReviewStatus(r.id, "rejected")}>
<FiX className="mr-2" /> Rejeter
</Button>
</div>
</div>
</div>
))}
</div>
)}
</div>
</Card>
</motion.div>
)}

{/* ------------------ PROMOS & LOYALTY ------------------ */}
{activeTab === "promos" && (
<motion.div key="promos" {...pageAnim}>
<div className="grid lg:grid-cols-2 gap-4">
<Card>
<CardHeader
icon={<FiTag />}
title="Promos / Coupons"
right={
<Button onClick={() => setShowPromoModal(true)}>
<FiPlus className="mr-2" /> Ajouter
</Button>
}
/>
<div className="p-6">
{promos.length === 0 ? (
<EmptyState icon={<FiTag />} title="Aucune promo" subtitle="Ajoute des codes promo." />
) : (
<div className="space-y-3">
{promos.map((p) => (
<div key={p.id} className="p-4 bg-gray-50 rounded-2xl flex items-start justify-between gap-3">
<div>
<div className="flex items-center gap-2 flex-wrap">
<span className="font-extrabold text-gray-900">{p.code}</span>
<Badge tone="purple">{p.type === "percent" ? `${p.value}%` : `${formatMoney(p.value)}`}</Badge>
{p.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
</div>
<p className="text-xs text-gray-500 mt-2">Expire: {p.expiresAt || "—"}</p>
</div>
<div className="flex gap-2">
<Button variant="secondary" className="px-3 py-2" onClick={() => togglePromo(p.id)}>
{p.active ? "Désactiver" : "Activer"}
</Button>
<IconButton title="Supprimer" onClick={() => deletePromo(p.id)}>
<FiTrash2 />
</IconButton>
</div>
</div>
))}
</div>
)}
</div>
</Card>

<Card>
<CardHeader icon={<FiGift />} title="Fidélité" subtitle="Points + récompense" />
<div className="p-6 space-y-4">
<div className="flex items-center gap-2">
<input type="checkbox" checked={!!loyalty.enabled} onChange={(e) => setLoyalty((p) => ({ ...p, enabled: e.target.checked }))} />
<span className="text-sm font-semibold text-gray-700">Activer la fidélité</span>
</div>

<div className="grid grid-cols-2 gap-4">
<Input label="Points / réservation" type="number" value={loyalty.pointsPerBooking} onChange={(e) => setLoyalty((p) => ({ ...p, pointsPerBooking: Number(e.target.value) }))} />
<Input label="Seuil points" type="number" value={loyalty.rewardThreshold} onChange={(e) => setLoyalty((p) => ({ ...p, rewardThreshold: Number(e.target.value) }))} />
</div>

<Input label="Récompense" value={loyalty.rewardLabel} onChange={(e) => setLoyalty((p) => ({ ...p, rewardLabel: e.target.value }))} />

<Button variant="secondary" onClick={() => toast.success("Fidélité sauvegardée ")}>
<FiSave className="mr-2" /> Sauvegarder
</Button>
</div>
</Card>
</div>

<Modal
open={showPromoModal}
title="Ajouter un coupon"
onClose={() => setShowPromoModal(false)}
footer={
<div className="flex gap-3 justify-end">
<Button variant="secondary" onClick={() => setShowPromoModal(false)}>
Annuler
</Button>
<Button onClick={addPromo}>
<FiPlus className="mr-2" /> Ajouter
</Button>
</div>
}
>
<div className="space-y-4">
<Input label="Code *" value={promoForm.code} onChange={(e) => setPromoForm((p) => ({ ...p, code: e.target.value }))} hint="Ex: WELCOME10" />
<Select label="Type" value={promoForm.type} onChange={(e) => setPromoForm((p) => ({ ...p, type: e.target.value }))}>
<option value="percent">Pourcentage</option>
<option value="amount">Montant (FCFA)</option>
</Select>
<Input label="Valeur *" type="number" value={promoForm.value} onChange={(e) => setPromoForm((p) => ({ ...p, value: Number(e.target.value) }))} />
<Input label="Expiration" type="date" value={promoForm.expiresAt} onChange={(e) => setPromoForm((p) => ({ ...p, expiresAt: e.target.value }))} />
<div className="flex items-center gap-2">
<input type="checkbox" checked={promoForm.active} onChange={(e) => setPromoForm((p) => ({ ...p, active: e.target.checked }))} />
<span className="text-sm font-semibold text-gray-700">Active</span>
</div>
</div>
</Modal>
</motion.div>
)}

{/* ------------------ CRM ------------------ */}
{activeTab === "crm" && (
<motion.div key="crm" {...pageAnim}>
<div className="grid lg:grid-cols-3 gap-4">
<Card className="lg:col-span-1">
<CardHeader icon={<FiUser />} title="Clients" />
<div className="p-6">
<div className="relative mb-4">
<FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
<input
value={clientQuery}
onChange={(e) => setClientQuery(e.target.value)}
placeholder="Rechercher client…"
className={cx(
"w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-2xl bg-white",
"focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
)}
/>
</div>

<div className="space-y-2">
{filteredClients.map((c) => (
<button
key={c.id}
onClick={() => setSelectedClient(c)}
className={cx(
"w-full text-left p-4 rounded-2xl border transition-colors",
selectedClient?.id === c.id
? "border-gray-900 bg-gray-50"
: "border-gray-100 bg-white hover:bg-gray-50"
)}
>
<div className="flex items-center justify-between gap-2">
<div>
<p className="font-extrabold text-gray-900">{c.name}</p>
<p className="text-xs text-gray-500 mt-1">{c.phone || "—"}</p>
<p className="text-xs text-gray-400">{c.address || ""}</p>
</div>
<Badge tone={c.noShowCount > 0 ? "red" : "green"}>No-show: {c.noShowCount}</Badge>
</div>
</button>
))}
</div>
</div>
</Card>

<Card className="lg:col-span-2">
<CardHeader
icon={<FiEdit3 />}
title="Fiche client"
right={
selectedClient ? (
<Button variant="secondary" onClick={() => markNoShow(selectedClient.id)}>
<FiX className="mr-2" /> + No-show
</Button>
) : null
}
/>
<div className="p-6">
{!selectedClient ? (
<EmptyState icon={<FiUser />} title="Sélectionne un client" subtitle="Clique sur un client à gauche pour voir sa fiche." />
) : (
<div className="space-y-5">
<div className="flex items-start justify-between gap-3">
<div>
<h3 className="text-xl font-extrabold text-gray-900">{selectedClient.name}</h3>
<p className="text-sm text-gray-500 mt-1">{selectedClient.phone || "—"}</p>
<p className="text-sm text-gray-500">{selectedClient.email || "—"}</p>
</div>
<Badge tone={selectedClient.noShowCount > 0 ? "red" : "green"}>No-show: {selectedClient.noShowCount}</Badge>
</div>

<div className="grid md:grid-cols-2 gap-4">
<div className="md:col-span-2">
<Input
label="Adresse"
value={clientAddressDraft}
onChange={(e) => setClientAddressDraft(e.target.value)}
placeholder="Adresse du client"
/>
<div className="mt-2 flex justify-end">
<Button
variant="secondary"
onClick={saveClientAddress}
disabled={savingClientAddress || clientAddressDraft === (selectedClient.address || "")}
>
Sauvegarder l'adresse
</Button>
</div>
</div>
<Textarea
label="Préférences"
rows={4}
value={selectedClient.preferences || ""}
onChange={(e) => {
updateClientNotes(selectedClient.id, "preferences", e.target.value);
setSelectedClient((p) => ({ ...p, preferences: e.target.value }));
}}
/>
<Textarea
label="Notes internes"
rows={4}
value={selectedClient.notes || ""}
onChange={(e) => {
updateClientNotes(selectedClient.id, "notes", e.target.value);
setSelectedClient((p) => ({ ...p, notes: e.target.value }));
}}
/>
<div className="flex justify-end">
  <Button variant="secondary" onClick={saveClientNotes} disabled={savingClientAddress}>
    Sauvegarder notes
  </Button>
</div>
</div>

<div>
<h4 className="font-extrabold text-gray-900 mb-3">Historique</h4>
<div className="space-y-2">
{(selectedClient.history || []).map((h) => (
<div key={h.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
<div>
<p className="font-extrabold text-gray-900">{h.service}</p>
<p className="text-xs text-gray-500 mt-1">{h.date} à {getStatusLabel(h.status)}</p>
</div>
<span className="font-extrabold text-gray-900">{formatMoney(h.amount)}</span>
</div>
))}
</div>
</div>
</div>
)}
</div>
</Card>
</div>
</motion.div>
)}

{/* ------------------ STATS ------------------ */}
{activeTab === "stats" && (
<motion.div key="stats" {...pageAnim}>
<div className="mb-6">
<div className="flex flex-wrap gap-2">
{[
{ id: "today", label: "Aujourd'hui" },
{ id: "week", label: "Cette semaine" },
{ id: "month", label: "Ce mois" },
{ id: "year", label: "Cette année" },
].map((p) => (
<button
key={p.id}
onClick={() => setStatsPeriod(p.id)}
className={cx(
"px-4 py-2 rounded-2xl font-semibold text-sm transition-all",
statsPeriod === p.id ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
)}
>
{p.label}
</button>
))}
</div>
<p className="text-xs text-gray-500 mt-2">Période : {formatPeriodLabel(statsPeriod)}</p>
</div>

<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
<div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
<div className="flex items-center justify-between">
<div>
<p className="text-gray-500 text-sm font-semibold">Chiffre d'affaires</p>
<p className="text-2xl font-extrabold text-gray-900 mt-1">{formatMoney(stats.totalRevenue)}</p>
</div>
<div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
<FiDollarSign className="w-6 h-6 text-green-700" />
</div>
</div>
</div>

<div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
<div className="flex items-center justify-between">
<div>
<p className="text-gray-500 text-sm font-semibold">Réservations</p>
<p className="text-2xl font-extrabold text-gray-900 mt-1">{stats.totalBookings}</p>
</div>
<div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
<FiCalendar className="w-6 h-6 text-blue-700" />
</div>
</div>
</div>

<div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
<div className="flex items-center justify-between">
<div>
<p className="text-gray-500 text-sm font-semibold">Panier moyen</p>
<p className="text-2xl font-extrabold text-gray-900 mt-1">{formatMoney(stats.averageTicket)}</p>
</div>
<div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
<FiTrendingUp className="w-6 h-6 text-amber-700" />
</div>
</div>
</div>

<div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
<div className="flex items-center justify-between">
<div>
<p className="text-gray-500 text-sm font-semibold">Annulations</p>
<p className="text-2xl font-extrabold text-gray-900 mt-1">{stats.cancelledBookings}</p>
</div>
<div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
<FiX className="w-6 h-6 text-red-700" />
</div>
</div>
</div>
</div>

<div className="grid lg:grid-cols-2 gap-4">
<div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
<h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
<FiGrid />
Top services
</h3>

{stats.topServices.length > 0 ? (
<div className="space-y-4">
{stats.topServices.map(([name, count]) => {
const maxCount = stats.topServices[0]?.[1] || 1;
const pct = (count / maxCount) * 100;
return (
<div key={name}>
<div className="flex items-center justify-between mb-1">
<span className="text-gray-700 font-semibold">{name}</span>
<span className="font-extrabold text-gray-900">{count}</span>
</div>
<div className="h-2 bg-gray-100 rounded-full overflow-hidden">
<div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full" style={{ width: `${pct}%` }} />
</div>
</div>
);
})}
</div>
) : (
<p className="text-gray-500 text-center py-8">Pas encore de données pour cette période.</p>
)}
</div>

<div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
<h3 className="font-extrabold text-gray-900 mb-4">Résumé d'activité</h3>
<div className="space-y-3">
<div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl">
<div className="flex items-center">
<div className="w-10 h-10 bg-green-600 rounded-2xl flex items-center justify-center mr-3">
<FiCheck className="w-5 h-5 text-white" />
</div>
<span className="font-bold text-gray-900">RDV terminés</span>
</div>
<span className="text-xl font-extrabold text-green-700">{stats.completedBookings}</span>
</div>

<div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
<div className="flex items-center">
<div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center mr-3">
<FiClock className="w-5 h-5 text-white" />
</div>
<span className="font-bold text-gray-900">RDV À venir</span>
</div>
<span className="text-xl font-extrabold text-blue-700">
{appointments.filter((a) => a.status === "upcoming").length}
</span>
</div>

<div className="flex items-center justify-between p-4 bg-red-50 rounded-2xl">
<div className="flex items-center">
<div className="w-10 h-10 bg-red-600 rounded-2xl flex items-center justify-center mr-3">
<FiX className="w-5 h-5 text-white" />
</div>
<span className="font-bold text-gray-900">Annulations</span>
</div>
<span className="text-xl font-extrabold text-red-700">{stats.cancelledBookings}</span>
</div>
</div>
</div>
</div>
</motion.div>
)}

{/* ------------------ SETTINGS ------------------ */}
{activeTab === "settings" && (
<motion.div key="settings" {...pageAnim} className="space-y-4">
<Card>
<CardHeader
icon={<FiSettings />}
title="Paramètres du salon"
right={
<Button onClick={saveSettings} disabled={savingSettings}>
<FiSave className="mr-2" /> Sauvegarder
</Button>
}
/>
<div className="p-6">
<div className="grid md:grid-cols-2 gap-6">
<Input label="Nom du salon" value={salonSettings.name} onChange={(e) => setSalonSettings((p) => ({ ...p, name: e.target.value }))} />
<Input label="Téléphone" value={salonSettings.phone} onChange={(e) => setSalonSettings((p) => ({ ...p, phone: e.target.value }))} />
<Input label="WhatsApp" value={salonSettings.whatsapp} onChange={(e) => setSalonSettings((p) => ({ ...p, whatsapp: e.target.value }))} />
<Input label="Adresse" value={salonSettings.address} onChange={(e) => setSalonSettings((p) => ({ ...p, address: e.target.value }))} />
<Textarea className="md:col-span-2" label="Description" rows={4} value={salonSettings.description} onChange={(e) => setSalonSettings((p) => ({ ...p, description: e.target.value }))} />
<div className="md:col-span-2">
  <label className="block text-sm font-semibold text-gray-700 mb-2">Photo du salon</label>
  <div className="flex flex-col md:flex-row gap-4">
    <div className="w-full md:w-64 h-40 rounded-2xl overflow-hidden bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
      {salonSettings.image ? (
        <img src={resolveMediaUrl(salonSettings.image)} alt="Salon" className="w-full h-full object-cover" />
      ) : (
        <FiImage className="w-10 h-10 text-gray-300" />
      )}
    </div>
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (!validateMedia(file)) return;
          readMediaAsDataUrl(file, (dataUrl) =>
            setSalonSettings((p) => ({ ...p, image: dataUrl }))
          );
          try {
            const imageUrl = await uploadSalonImage(file);
            if (imageUrl) {
              setSalonSettings((p) => ({ ...p, image: imageUrl }));
              toast.success("Photo du salon mise à jour.");
            }
          } catch (err) {
            toast.error(err.message || "Erreur lors de l'upload de l'image.");
          }
        }}
        className="block text-sm text-gray-600"
      />
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => setSalonSettings((p) => ({ ...p, image: "" }))}
        >
          Supprimer
        </Button>
        <Button variant="secondary" onClick={saveSettings} disabled={savingSettings}>
          <FiSave className="mr-2" /> Sauvegarder
        </Button>
      </div>
      <p className="text-xs text-gray-500">
        Ajoute une image carrée ou paysage. Elle sera affichée sur la page d’accueil et la fiche salon.
      </p>
    </div>
  </div>
</div>
</div>
</div>
</Card>

<Card>
<CardHeader
icon={<FiClock />}
title="Horaires d'ouverture"
right={
<Button variant="secondary" onClick={saveSettings} disabled={savingSettings}>
<FiSave className="mr-2" /> Sauvegarder
</Button>
}
/>
<div className="p-6 space-y-3">
{weekDays.map(([label, key]) => {
const hours = salonSettings.openingHours?.[key];
return (
<div key={key} className="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-gray-50 rounded-2xl">
<span className="w-24 font-extrabold text-gray-900">{label}</span>
{hours ? (
<>
<input
type="time"
value={hours.open}
onChange={(e) =>
setSalonSettings((p) => ({
...p,
openingHours: { ...p.openingHours, [key]: { ...hours, open: e.target.value } },
}))
}
className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
/>
<span className="text-gray-500 font-semibold">—</span>
<input
type="time"
value={hours.close}
onChange={(e) =>
setSalonSettings((p) => ({
...p,
openingHours: { ...p.openingHours, [key]: { ...hours, close: e.target.value } },
}))
}
className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
/>
<button
onClick={() => setSalonSettings((p) => ({ ...p, openingHours: { ...p.openingHours, [key]: null } }))}
className="text-red-600 hover:text-red-700 font-semibold text-sm"
>
Marquer fermé
</button>
</>
) : (
<>
<span className="text-gray-400 font-semibold">Fermé</span>
<button
onClick={() =>
setSalonSettings((p) => ({
...p,
openingHours: { ...p.openingHours, [key]: { open: "09:00", close: "18:00" } },
}))
}
className="text-amber-700 hover:text-amber-800 font-semibold text-sm"
>
Ajouter horaires
</button>
</>
)}
</div>
);
})}
</div>
</Card>
</motion.div>
)}
</AnimatePresence>

<button
  type="button"
  onClick={openFloatingChat}
  className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/25 transition hover:bg-gray-800"
>
  <FiMessageCircle className="h-4 w-4" /> Chat rapide
</button>

<AppointmentChatModal
  isOpen={showChatModal}
  onClose={() => setShowChatModal(false)}
  appointment={chatAppointment}
  appointments={appointments}
  showThreadList
  currentUserId={user?.id}
/>
</div>
</div>
);
}










