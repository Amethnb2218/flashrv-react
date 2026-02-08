import { useEffect, useMemo, useRef, useState } from "react";
import apiFetch from "@/api/client";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
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
} from "react-icons/fi";

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
paid: "Payé",
deposit_paid: "Acompte payé",
refunded: "Remboursé",
unpaid: "Impayé",
pending: "En attente",
approved: "Approuvé",
rejected: "Rejeté",
};

const modalAnim = {
initial: { opacity: 0, scale: 0.98, y: 8 },
animate: { opacity: 1, scale: 1, y: 0 },
exit: { opacity: 0, scale: 0.98, y: 8 },
transition: { duration: 0.18 },
};

const MAX_MEDIA_MB = 6;

/* ----------------------------
Small utils
----------------------------- */
const cx = (...arr) => arr.filter(Boolean).join(" ");

const formatMoney = (n) =>
Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " F";

const isImage = (src) => String(src || "").startsWith("data:image");
const isVideo = (src) => String(src || "").startsWith("data:video");

function clampNumber(value, min, max) {
const n = Number(value);
if (Number.isNaN(n)) return min;
return Math.max(min, Math.min(max, n));
}

function uuid(prefix = "id") {
return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatDate(d) {
try {
return new Date(d).toLocaleDateString("fr-FR");
} catch {
return String(d);
}
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
const { isAuthenticated, checkAuth } = useAuth();

// IMPORTANT: on garde l'onglet "portfolio" MAIS le label est "Salon".
// Donc activeTab doit toujours être "portfolio" (et surtout PAS "salon").
const [activeTab, setActiveTab] = useState("appointments");

// data
const [appointments, setAppointments] = useState([]);
const [services, setServices] = useState([]);
const [loading, setLoading] = useState(true);

// Payment methods
const [paymentMethods, setPaymentMethods] = useState([]); // {id, method, enabled}
const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
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
beforeMedia: "",
afterMedia: "",
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
// ✅ on garde l'id "portfolio", mais le label affiché = "Salon"
{ id: "portfolio", label: "Salon", icon: FiCamera },
{ id: "reviews", label: "Avis", icon: FiStar },
{ id: "promos", label: "Promos & Fidélité", icon: FiGift },
{ id: "crm", label: "CRM Clients", icon: FiUser },
{ id: "stats", label: "Stats", icon: FiBarChart2 },
{ id: "settings", label: "Paramètres", icon: FiSettings },
],
[]
);

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
setPaymentMethods((prev) => [res.data, ...prev]);
setShowPaymentMethodModal(false);
setNewPaymentMethod({ method: "", enabled: true });
toast.success("Moyen de paiement ajouté !");
} catch (e) {
toast.error(e.message || "Erreur lors de l'ajout");
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
setPaymentMethods(res.data || []);
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
]) => {
setServices(servicesRes.data || []);
setTeam(teamRes.data || []);
setAppointments(appointmentsRes.data || []);
setClients(clientsRes.data || []);
setReviews(reviewsRes.data || []);
setPromos(promosRes.data || []);
setPortfolio(portfolioRes.data || []);
setPlanning({
breaks: breaksRes.data || [],
exceptions: exceptionsRes.data || [],
holidays: holidaysRes.data || [],
});
setPayments(paymentsRes.data || []);
if (loyaltyRes.data && loyaltyRes.data.settings) setLoyalty(loyaltyRes.data.settings);
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
// TODO: refetch stats by period
}, [statsPeriod]);

/* ----------------------------
Media handling
----------------------------- */
const readMediaAsDataUrl = (file, cb) => {
const reader = new FileReader();
reader.onload = (event) => cb(String(event.target?.result || ""));
reader.readAsDataURL(file);
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
return clients.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q));
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
});

const handleAddService = () => {
const name = newService.name?.trim();
const price = Number(newService.price);
if (!name) return toast.error("Le nom du service est obligatoire.");
if (!price || price <= 0) return toast.error("Le prix est obligatoire.");

const created = {
id: uuid("s"),
name,
category: newService.category,
description: newService.description?.trim() || "",
price,
duration: clampNumber(newService.duration, 15, 360),
depositPercentage: clampNumber(newService.depositPercentage, 0, 80),
media: newService.media || "",
createdAt: Date.now(),
};

setServices((prev) => [created, ...prev]);
toast.success("Service ajouté !");
setShowServiceModal(false);
resetNewService();
};

const handleUpdateService = () => {
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

setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
toast.success("Service mis à jour !");
setEditingService(null);
};

const confirmDeleteService = () => {
if (!confirmDelete?.id) return;
setServices((prev) => prev.filter((s) => s.id !== confirmDelete.id));
toast.success("Service supprimé.");
setConfirmDelete(null);
};

/* ----------------------------
Actions - Appointments & Payments
----------------------------- */
const setAppointmentStatus = (id, status) => {
setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
toast.success("Statut mis à jour.");
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
toast.success("Facture générée (démo).");
downloadInvoiceLikeFile(invoice);
};

const refundAppointmentDeposit = (appt) => {
if (!appt.depositPaid || (appt.depositPct || 0) <= 0) {
toast.error("Aucun acompte à rembourser.");
return;
}
setAppointments((prev) =>
prev.map((a) =>
a.id === appt.id ? { ...a, paymentStatus: "refunded", depositPaid: false } : a
)
);
toast.success("Remboursement (démo) effectué.");
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

const addMember = () => {
if (!newMember.name.trim()) return toast.error("Nom requis.");
const created = { ...newMember, id: uuid("t") };
setTeam((prev) => [created, ...prev]);
toast.success("Membre ajouté.");
setShowTeamModal(false);
resetNewMember();
};

const updateMember = () => {
if (!editingMember?.id) return;
if (!editingMember.name.trim()) return toast.error("Nom requis.");
setTeam((prev) => prev.map((m) => (m.id === editingMember.id ? editingMember : m)));
toast.success("Membre mis à jour.");
setEditingMember(null);
};

const deleteMember = (id) => {
setTeam((prev) => prev.filter((m) => m.id !== id));
toast.success("Membre supprimé.");
};

/* ----------------------------
Actions - Planning
----------------------------- */
const addPlanningItem = () => {
if (!planningForm.date) return toast.error("Date requise.");
const t = planningForm.type;
if (t === "break") {
setPlanning((p) => ({
...p,
breaks: [
{
id: uuid("br"),
date: planningForm.date,
start: planningForm.start,
end: planningForm.end,
label: planningForm.label || "Pause",
},
...p.breaks,
],
}));
toast.success("Pause ajoutée.");
}
if (t === "exception") {
setPlanning((p) => ({
...p,
exceptions: [
{
id: uuid("ex"),
date: planningForm.date,
open: planningForm.open,
close: planningForm.close,
closed: !!planningForm.closed,
},
...p.exceptions,
],
}));
toast.success("Exception ajoutée.");
}
if (t === "holiday") {
setPlanning((p) => ({
...p,
holidays: [
{ id: uuid("hol"), date: planningForm.date, name: planningForm.name || "Jour férié" },
...p.holidays,
],
}));
toast.success("Jour férié ajouté.");
}
setShowPlanningModal(false);
};

const removePlanningItem = (type, id) => {
setPlanning((p) => ({
...p,
[type]: p[type].filter((x) => x.id !== id),
}));
toast.success("Supprimé.");
};

/* ----------------------------
Actions - Salon (portfolio)
----------------------------- */
const addPortfolioItem = () => {
if (!portfolioForm.title.trim()) return toast.error("Titre requis.");
if (portfolioForm.type === "gallery" && !portfolioForm.media) return toast.error("Ajoute une photo/vidéo.");
if (portfolioForm.type === "beforeAfter" && (!portfolioForm.beforeMedia || !portfolioForm.afterMedia))
return toast.error("Ajoute AVANT et APRÈS.");

const created =
portfolioForm.type === "gallery"
? { id: uuid("pf"), type: "gallery", title: portfolioForm.title.trim(), media: portfolioForm.media, createdAt: Date.now() }
: {
id: uuid("pf"),
type: "beforeAfter",
title: portfolioForm.title.trim(),
beforeMedia: portfolioForm.beforeMedia,
afterMedia: portfolioForm.afterMedia,
createdAt: Date.now(),
};

setPortfolio((p) => [created, ...p]);
toast.success("Ajouté au salon.");
setShowPortfolioModal(false);
setPortfolioForm({ type: "gallery", title: "", media: "", beforeMedia: "", afterMedia: "" });
};

const removePortfolioItem = (id) => {
setPortfolio((p) => p.filter((x) => x.id !== id));
toast.success("Supprimé.");
};

/* ----------------------------
Actions - Reviews moderation
----------------------------- */
const setReviewStatus = (id, status) => {
setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
toast.success("Avis mis à jour.");
};

/* ----------------------------
Actions - Promos + loyalty
----------------------------- */
const addPromo = () => {
const code = promoForm.code.trim().toUpperCase();
if (!code) return toast.error("Code requis.");
if (!promoForm.value || Number(promoForm.value) <= 0) return toast.error("Valeur invalide.");

setPromos((p) => [
{
id: uuid("promo"),
code,
type: promoForm.type,
value: Number(promoForm.value),
active: !!promoForm.active,
expiresAt: promoForm.expiresAt || "",
},
...p,
]);
toast.success("Promo ajoutée.");
setShowPromoModal(false);
setPromoForm({ code: "", type: "percent", value: 10, expiresAt: "", active: true });
};

const togglePromo = (id) => {
setPromos((p) => p.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
};

const deletePromo = (id) => {
setPromos((p) => p.filter((x) => x.id !== id));
toast.success("Promo supprimée.");
};

/* ----------------------------
Actions - CRM
----------------------------- */
const markNoShow = (clientId) => {
setClients((prev) =>
prev.map((c) => (c.id === clientId ? { ...c, noShowCount: (c.noShowCount || 0) + 1 } : c))
);
toast.success("No-show ajouté.");
};

const updateClientNotes = (clientId, field, value) => {
setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, [field]: value } : c)));
};

/* ----------------------------
Derived stats
----------------------------- */
useEffect(() => {
const completed = appointments.filter((a) => a.status === "completed");
const cancelled = appointments.filter((a) => a.status === "cancelled");

const totalRevenue = completed.reduce((sum, a) => sum + (a.amount || 0), 0);
const averageTicket = completed.length ? Math.round(totalRevenue / completed.length) : 0;

const countsByService = new Map();
for (const a of appointments) {
countsByService.set(a.serviceName, (countsByService.get(a.serviceName) || 0) + 1);
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
}, [appointments]);

const saveSettings = () => {
toast.success("Paramètres sauvegardés ! (démo)");
};

const salonName = salonSettings.name?.trim() || "Dashboard PRO";
const upcomingCount = appointments.filter((a) => a.status === "upcoming").length;
const completedCount = appointments.filter((a) => a.status === "completed").length;
const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;

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
Gestion des RDV, services, équipe, planning, paiements, salon, avis, promos, CRM et paramètres.
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

<AnimatePresence mode="wait">
{/* ------------------ APPOINTMENTS ------------------ */}
{activeTab === "appointments" && (
<motion.div key="appointments" {...pageAnim}>
<Card>
<CardHeader icon={<FiCalendar />} title="Rendez-vous" />
<div className="p-6">
{loading ? (
<p className="text-gray-500 font-semibold">Chargement…</p>
) : appointments.length === 0 ? (
<EmptyState
icon={<FiCalendar />}
title="Aucun rendez-vous"
subtitle="Les réservations apparaîtront ici."
/>
) : (
<DataTable
emptyLabel="Aucun rendez-vous"
columns={[
{ key: "clientName", label: "Client" },
{ key: "date", label: "Date" },
{ key: "time", label: "Heure" },
{ key: "serviceName", label: "Service" },
{
key: "staffName",
label: "Employé",
render: (row) => <span className="font-semibold">{row.staffName || "-"}</span>,
},
{
key: "paymentStatus",
label: "Paiement",
render: (row) => {
const tone =
row.paymentStatus === "paid"
? "green"
: row.paymentStatus === "deposit_paid"
? "blue"
: row.paymentStatus === "refunded"
? "red"
: "gray";
const label = statusLabels[row.paymentStatus] || row.paymentStatus;
return <Badge tone={tone}>{label}</Badge>;
},
},
{
key: "status",
label: "Statut",
render: (row) => {
const tone =
row.status === "completed" ? "green" : row.status === "cancelled" ? "red" : "blue";
const label = statusLabels[row.status] || row.status;
return <Badge tone={tone}>{label}</Badge>;
},
},
{
key: "actions",
label: "Actions",
render: (row) => (
<div className="flex gap-2 flex-wrap">
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
</div>
),
},
]}
data={appointments}
/>
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
<option value="priceAsc">Prix ↑</option>
<option value="priceDesc">Prix ↓</option>
<option value="durationAsc">Durée ↑</option>
<option value="durationDesc">Durée ↓</option>
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
{filteredServices.map((service) => (
<div
key={service.id}
className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow"
>
<div className="mb-3">
{service.media ? (
isImage(service.media) ? (
<img src={service.media} alt="aperçu" className="w-full h-36 object-cover rounded-2xl" />
) : isVideo(service.media) ? (
<video src={service.media} controls className="w-full h-36 object-cover rounded-2xl" />
) : (
<div className="w-full h-36 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
<FiImage className="w-8 h-8 text-gray-300" />
</div>
)
) : (
<div className="w-full h-36 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
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
<IconButton title="Modifier" onClick={() => setEditingService({ ...service })}>
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
))}
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
<label className="block text-sm font-semibold text-gray-700 mb-1">Média (photo ou vidéo)</label>
<input
ref={fileInputRef}
type="file"
accept="image/*,video/*"
onChange={(e) => {
const file = e.target.files?.[0];
if (!file) return;
if (!validateMedia(file)) return;
readMediaAsDataUrl(file, (dataUrl) => setNewService((p) => ({ ...p, media: dataUrl })));
}}
className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl"
/>
{newService.media ? (
<div className="mt-3 flex items-start gap-3">
{isImage(newService.media) ? (
<img src={newService.media} alt="preview" className="w-28 h-28 object-cover rounded-2xl border border-gray-100" />
) : (
<video src={newService.media} controls className="w-28 h-28 object-cover rounded-2xl border border-gray-100" />
)}
<Button variant="secondary" className="px-4" onClick={() => setNewService((p) => ({ ...p, media: "" }))}>
Retirer
</Button>
</div>
) : (
<p className="text-xs text-gray-500 mt-2">Max {MAX_MEDIA_MB}MB — image/* ou video/*</p>
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
<label className="block text-sm font-semibold text-gray-700 mb-1">Média (photo ou vidéo)</label>
<input
type="file"
accept="image/*,video/*"
onChange={(e) => {
const file = e.target.files?.[0];
if (!file) return;
if (!validateMedia(file)) return;
readMediaAsDataUrl(file, (dataUrl) => setEditingService((p) => ({ ...p, media: dataUrl })));
}}
className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl"
/>
{editingService.media ? (
<div className="mt-3 flex items-start gap-3">
{isImage(editingService.media) ? (
<img src={editingService.media} alt="preview" className="w-28 h-28 object-cover rounded-2xl border border-gray-100" />
) : (
<video src={editingService.media} controls className="w-28 h-28 object-cover rounded-2xl border border-gray-100" />
)}
<Button variant="secondary" className="px-4" onClick={() => setEditingService((p) => ({ ...p, media: "" }))}>
Retirer
</Button>
</div>
) : (
<p className="text-xs text-gray-500 mt-2">Max {MAX_MEDIA_MB}MB — image/* ou video/*</p>
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
<EmptyState icon={<FiUsers />} title="Aucun employé" subtitle="Ajoutez les membres de votre équipe." />
) : (
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
{team.map((m) => (
<div key={m.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
<div className="flex items-start justify-between gap-3 mb-4">
<div className="min-w-0">
<h4 className="text-base font-extrabold text-gray-900 truncate">{m.name}</h4>
<div className="mt-2 flex gap-2 items-center flex-wrap">
<Badge tone="purple">{m.role}</Badge>
{m.active ? <Badge tone="green">Actif</Badge> : <Badge tone="red">Inactif</Badge>}
</div>
{m.phone ? <p className="text-sm text-gray-500 mt-2">{m.phone}</p> : null}
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

<div className="mt-4 pt-4 border-t border-gray-100">
<p className="text-xs font-extrabold text-gray-700 mb-2">Disponibilités</p>
<div className="space-y-1">
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
))}
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
<span className="text-gray-500 font-semibold">à</span>
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
<span className="text-gray-500 font-semibold">à</span>
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
<p className="text-xs text-gray-500">{b.date} • {b.start}-{b.end}</p>
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
{/* ✅ petit fix: afficher payments si dispo, sinon fallback appointments (tu ne perds aucune donnée) */}
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
const label = statusLabels[r.paymentStatus] || r.paymentStatus;
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
<Badge tone={pm.enabled ? "green" : "gray"}>{pm.enabled ? "OK" : "OFF"}</Badge>
</div>
))}
</div>
</>
)}
</div>

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
</Card>
</motion.div>
)}

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
{portfolio.map((p) => (
<div key={p.id} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
<div className="flex items-start justify-between gap-2">
<div className="min-w-0">
<Badge tone="purple">{p.type === "beforeAfter" ? "Avant/Après" : "Galerie"}</Badge>
<h4 className="mt-2 text-base font-extrabold text-gray-900 truncate">{p.title}</h4>
<p className="text-xs text-gray-500 mt-1">{formatDate(p.createdAt)}</p>
</div>
<IconButton title="Supprimer" onClick={() => removePortfolioItem(p.id)}>
<FiTrash2 />
</IconButton>
</div>

<div className="mt-3">
{p.type === "gallery" ? (
p.media ? (
isImage(p.media) ? (
<img src={p.media} alt="salon" className="w-full h-44 object-cover rounded-2xl" />
) : (
<video src={p.media} controls className="w-full h-44 object-cover rounded-2xl" />
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
isImage(p.beforeMedia) ? (
<img src={p.beforeMedia} alt="avant" className="w-full h-36 object-cover rounded-2xl" />
) : (
<video src={p.beforeMedia} controls className="w-full h-36 object-cover rounded-2xl" />
)
) : (
<div className="w-full h-36 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
<FiImage className="w-6 h-6 text-gray-300" />
</div>
)}
</div>
<div>
<p className="text-xs font-extrabold text-gray-700 mb-2">Après</p>
{p.afterMedia ? (
isImage(p.afterMedia) ? (
<img src={p.afterMedia} alt="après" className="w-full h-36 object-cover rounded-2xl" />
) : (
<video src={p.afterMedia} controls className="w-full h-36 object-cover rounded-2xl" />
)
) : (
<div className="w-full h-36 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
<FiImage className="w-6 h-6 text-gray-300" />
</div>
)}
</div>
</div>
)}
</div>
</div>
))}
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
readMediaAsDataUrl(file, (dataUrl) => setPortfolioForm((p) => ({ ...p, media: dataUrl })));
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
readMediaAsDataUrl(file, (dataUrl) => setPortfolioForm((p) => ({ ...p, beforeMedia: dataUrl })));
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
readMediaAsDataUrl(file, (dataUrl) => setPortfolioForm((p) => ({ ...p, afterMedia: dataUrl })));
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
<Badge tone="amber">⭐ {r.rating}/5</Badge>
<Badge tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "blue"}>
{statusLabels[r.status] || r.status}
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

<Button variant="secondary" onClick={() => toast.success("Fidélité sauvegardée (démo)")}>
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
<p className="text-xs text-gray-500 mt-1">{c.phone}</p>
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
<p className="text-sm text-gray-500 mt-1">{selectedClient.phone}</p>
</div>
<Badge tone={selectedClient.noShowCount > 0 ? "red" : "green"}>No-show: {selectedClient.noShowCount}</Badge>
</div>

<div className="grid md:grid-cols-2 gap-4">
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
</div>

<div>
<h4 className="font-extrabold text-gray-900 mb-3">Historique</h4>
<div className="space-y-2">
{(selectedClient.history || []).map((h) => (
<div key={h.id} className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
<div>
<p className="font-extrabold text-gray-900">{h.service}</p>
<p className="text-xs text-gray-500 mt-1">{h.date} • {statusLabels[h.status] || h.status}</p>
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
<div className="flex flex-wrap gap-2 mb-6">
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
<span className="font-bold text-gray-900">RDV à venir</span>
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
<Button onClick={saveSettings}>
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
</div>
</div>
</Card>

<Card>
<CardHeader
icon={<FiClock />}
title="Horaires d'ouverture"
right={
<Button variant="secondary" onClick={saveSettings}>
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
<span className="text-gray-500 font-semibold">à</span>
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
</div>
</div>
);
}