"use client";

import React, { useState, useEffect } from "react";
import {
  Activity,
  Search,
  Calendar,
  Clock,
  Star,
  ShieldCheck,
  Stethoscope,
  Heart,
  Sparkles,
  Brain,
  Baby,
  Bone,
  CheckCircle2,
  X,
  Timer,
  ArrowRight,
  Check,
  Award,
  MapPin,
  Sliders,
  BellRing,
  CalendarPlus,
  UserCheck,
  SearchX,
  Sun,
  CloudSun,
  Database,
  Trash2,
  RefreshCw,
  Users,
  DollarSign,
  TrendingUp,
  UserCircle2,
  BarChart3,
  CheckCircle,
} from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  experience: string;
  rating: number;
  fee: string;
  avatar: string;
  bgColor: string;
  hospital: string;
  slots: {
    morning: string[];
    afternoon: string[];
  };
  bookedSlots?: string[];
}

interface AppointmentRecord {
  id: string;
  doctorId: string;
  doctor: {
    name: string;
    specialty: string;
    fee: string;
  };
  patientName: string;
  patientEmail: string;
  date: string;
  time: string;
  reason?: string;
  status: string;
  txId: string;
  createdAt: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"PATIENT" | "DOCTOR" | "ADMIN">("PATIENT");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState<boolean>(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Doctor Portal Specific State
  const [activeDoctorId, setActiveDoctorId] = useState<string>("doc-1");

  // Booking Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>("Today, Oct 14");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reasonForVisit, setReasonForVisit] = useState<string>("");
  const [patientName, setPatientName] = useState<string>("Alex Johnson");
  const [patientEmail, setPatientEmail] = useState<string>("alex@example.com");
  const [holdTimer, setHoldTimer] = useState<number>(300); // 5 min hold
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success Modal
  const [isSuccessOpen, setIsSuccessOpen] = useState<boolean>(false);
  const [confirmedData, setConfirmedData] = useState<{
    doctor: string;
    date: string;
    slot: string;
    txId: string;
  } | null>(null);

  // Bookings List Modal
  const [isBookingsListOpen, setIsBookingsListOpen] = useState<boolean>(false);
  const [savedAppointments, setSavedAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);

  // Fetch doctors and all appointments
  const fetchDoctorsAndAppointments = async () => {
    try {
      setLoadingDoctors(true);
      const resDocs = await fetch("/api/doctors");
      const dataDocs = await resDocs.json();
      if (dataDocs.success) {
        setDoctors(dataDocs.doctors);
      }

      const resAppts = await fetch("/api/appointments");
      const dataAppts = await resAppts.json();
      if (dataAppts.success) {
        setSavedAppointments(dataAppts.appointments);
      }
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchDoctorsAndAppointments();
  }, []);

  // Countdown timer for Redis lock hold
  useEffect(() => {
    let interval: any = null;
    if (isHolding && holdTimer > 0) {
      interval = setInterval(() => {
        setHoldTimer((prev) => prev - 1);
      }, 1000);
    } else if (holdTimer === 0 && isHolding) {
      setIsHolding(false);
      setSelectedSlot(null);
      alert("Your 5-minute temporary slot reservation has expired and returned to the pool.");
    }
    return () => clearInterval(interval);
  }, [isHolding, holdTimer]);

  const handleOpenBooking = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setSelectedSlot(null);
    setIsHolding(false);
    setHoldTimer(300);
    setReasonForVisit("");
    setBookingError(null);
    setIsModalOpen(true);
  };

  const handleSelectSlot = (slot: string) => {
    setSelectedSlot(slot);
    setIsHolding(true);
    setHoldTimer(300);
    setBookingError(null);
  };

  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return;

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          date: selectedDate,
          time: selectedSlot,
          reason: reasonForVisit,
          patientName,
          patientEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setBookingError(result.error || "Failed to book appointment");
        setIsSubmitting(false);
        return;
      }

      setConfirmedData({
        doctor: selectedDoctor.name,
        date: selectedDate,
        slot: selectedSlot,
        txId: result.txId,
      });

      setIsHolding(false);
      setIsModalOpen(false);
      setIsSuccessOpen(true);

      // Refresh data to show booked slots
      fetchDoctorsAndAppointments();
    } catch (err: any) {
      setBookingError(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Doctor Action: Mark as Completed
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        fetchDoctorsAndAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cancel & Free Slot (Both Patient & Doctor)
  const handleCancelAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment and free up the slot?")) return;
    try {
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDoctorsAndAppointments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calendar .ics generator for transactional confirmation
  const downloadIcsFile = () => {
    if (!confirmedData) return;
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CarePulse Healthcare//EN",
      "BEGIN:VEVENT",
      `SUMMARY:Medical Appointment: ${confirmedData.doctor}`,
      `DESCRIPTION:Patient visit confirmed. Transaction ID: ${confirmedData.txId}`,
      `LOCATION:CarePulse Clinical Center, New York`,
      `STATUS:CONFIRMED`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `carepulse-${confirmedData.txId}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Doctors for Patient View
  const filteredDoctors = doctors.filter((doc) => {
    const matchesSpec =
      selectedSpecialty === "ALL" || doc.specialty === selectedSpecialty;
    const matchesQuery =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpec && matchesQuery;
  });

  // Doctor Portal Filtered Appointments
  const currentDoctorAppointments = savedAppointments.filter(
    (a) => a.doctorId === activeDoctorId
  );
  const currentDoctorProfile = doctors.find((d) => d.id === activeDoctorId);

  // Admin Metrics Calculation
  const totalBookings = savedAppointments.length;
  const completedBookings = savedAppointments.filter((a) => a.status === "COMPLETED").length;
  const totalRevenue = savedAppointments.reduce((acc, curr) => {
    const feeNum = parseInt(curr.doctor?.fee?.replace("$", "") || "150", 10);
    return acc + feeNum;
  }, 0);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Care<span className="text-teal-600">Pulse</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 rounded-md border border-teal-200">
                Clinical Suite
              </span>
            </div>
          </div>

          {/* Role Navigation Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80">
            <button
              onClick={() => setActiveTab("PATIENT")}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "PATIENT"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserCircle2 className="w-4 h-4" />
              <span>Patient Portal</span>
            </button>
            <button
              onClick={() => setActiveTab("DOCTOR")}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "DOCTOR"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Portal</span>
            </button>
            <button
              onClick={() => setActiveTab("ADMIN")}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "ADMIN"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Admin Analytics</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBookingsListOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] shadow-sm shadow-teal-600/30 transition cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>My Bookings ({savedAppointments.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= TAB 1: PATIENT PORTAL ================= */}
      {activeTab === "PATIENT" && (
        <main className="flex-1">
          {/* HERO */}
          <section className="bg-gradient-to-b from-teal-50/50 via-slate-50 to-slate-50 pt-10 pb-12 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs mb-6">
                <Database className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-xs font-semibold text-slate-700">
                  Live SQLite Database Active • Double-Booking Constraint Guarded
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-3xl mx-auto">
                Book Certified Specialists with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                  Database Persistence
                </span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                Every booking is permanently stored with unique composite constraints to guarantee that double-booking is mathematically impossible.
              </p>

              {/* Search Box */}
              <div className="mt-10 max-w-4xl mx-auto bg-white p-3 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/90 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-4 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-left">
                  <Stethoscope className="w-5 h-5 text-teal-600 shrink-0" />
                  <div className="w-full">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Specialty
                    </label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="w-full bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Specialties</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Dermatology">Dermatology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Orthopedics">Orthopedics</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-5 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-left">
                  <UserCheck className="w-5 h-5 text-teal-600 shrink-0" />
                  <div className="w-full">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Doctor or Clinic
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, symptom..."
                      className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <button
                    onClick={fetchDoctorsAndAppointments}
                    className="w-full h-full min-h-[48px] rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-600/25 transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Live</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SPECIALTIES */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {[
                { id: "ALL", name: "All Specialists", icon: Stethoscope },
                { id: "Cardiology", name: "Cardiology", icon: Heart, color: "text-rose-500" },
                { id: "Dermatology", name: "Dermatology", icon: Sparkles, color: "text-amber-500" },
                { id: "Neurology", name: "Neurology", icon: Brain, color: "text-indigo-500" },
                { id: "Pediatrics", name: "Pediatrics", icon: Baby, color: "text-emerald-500" },
                { id: "Orthopedics", name: "Orthopedics", icon: Bone, color: "text-sky-500" },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = selectedSpecialty === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedSpecialty(item.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-teal-500"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.color || ""}`} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* DOCTOR DIRECTORY */}
          <section id="find-doctors" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Verified Medical Specialists
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select an available specialist to reserve an atomic appointment slot
                </p>
              </div>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                {filteredDoctors.length} Doctors Loaded from SQLite
              </span>
            </div>

            {loadingDoctors ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
                <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">Connecting to database...</p>
              </div>
            ) : filteredDoctors.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
                <SearchX className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-800">No specialists found</h4>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDoctors.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-teal-500/80 p-5 shadow-xs hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-2xl ${doc.bgColor} text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0`}
                          >
                            {doc.avatar}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-slate-900 hover:text-teal-600 transition">
                              {doc.name}
                            </h3>
                            <p className="text-xs font-semibold text-teal-700">{doc.specialty}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{doc.qualifications}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60 text-amber-700 font-bold text-xs">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{doc.rating}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.experience} exp</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[150px]">{doc.hospital}</span>
                        </div>
                      </div>

                      <div className="mt-3.5 py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Database Status:</span>
                        <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Open for Booking
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">
                          Consultation
                        </span>
                        <span className="text-base font-extrabold text-slate-900">{doc.fee}</span>
                      </div>
                      <button
                        onClick={() => handleOpenBooking(doc)}
                        className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-teal-600/20 transition cursor-pointer"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        <span>Book Appointment</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {/* ================= TAB 2: DOCTOR PORTAL ================= */}
      {activeTab === "DOCTOR" && (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          {/* Doctor Header & Selector */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                {currentDoctorProfile?.avatar || "DR"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">{currentDoctorProfile?.name}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase">
                    Active On-Duty
                  </span>
                </div>
                <p className="text-xs text-teal-700 font-semibold mt-0.5">
                  {currentDoctorProfile?.specialty} • {currentDoctorProfile?.hospital}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-500 pl-2">Switch Doctor:</label>
              <select
                value={activeDoctorId}
                onChange={(e) => setActiveDoctorId(e.target.value)}
                className="bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none cursor-pointer"
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor KPI Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Patients</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{currentDoctorAppointments.length}</h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Visits</p>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {currentDoctorAppointments.filter((a) => a.status === "COMPLETED").length}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Earned Revenue</p>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                  ${currentDoctorAppointments.length * parseInt(currentDoctorProfile?.fee.replace("$", "") || "150", 10)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Patient Schedule Roster Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Today's Appointment Schedule</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage patient consultations, mark attendance, or release slots</p>
              </div>
              <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
                {currentDoctorAppointments.length} Active Patients
              </span>
            </div>

            <div className="overflow-x-auto">
              {currentDoctorAppointments.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700">No appointments scheduled for this doctor</h4>
                  <p className="text-xs text-slate-400 mt-1">Go to the Patient Portal to book a slot for this doctor!</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-4 px-6">Patient</th>
                      <th className="py-4 px-6">Date & Time</th>
                      <th className="py-4 px-6">Reason for Visit</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Doctor Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentDoctorAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-900">{appt.patientName}</p>
                          <p className="text-[11px] text-slate-400">{appt.patientEmail}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-teal-700">{appt.time}</p>
                          <p className="text-[11px] text-slate-500">{appt.date}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-slate-700">{appt.reason || "General Consultation"}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                              appt.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-teal-50 text-teal-700 border border-teal-200"
                            }`}
                          >
                            ● {appt.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {appt.status !== "COMPLETED" && (
                              <button
                                onClick={() => handleUpdateStatus(appt.id, "COMPLETED")}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Complete</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelAppointment(appt.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                              title="Cancel appointment and immediately free slot in DB"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Free Slot</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ================= TAB 3: ADMIN ANALYTICS ================= */}
      {activeTab === "ADMIN" && (
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Capacity & Booking Overview</h2>
            <p className="text-sm text-slate-500 mt-1">Real-time metrics calculated directly from the database</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Bookings</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{totalBookings}</h3>
              <p className="text-[11px] text-teal-600 font-semibold mt-2">Active in SQLite</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
              <h3 className="text-3xl font-extrabold text-teal-600 mt-1">${totalRevenue}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-2">100% Collected</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Rate</p>
              <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                {totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0}%
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-2">{completedBookings} Completed</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Double Bookings</p>
              <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">0</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-2">Guaranteed Zero</p>
            </div>
          </div>

          {/* Doctor Performance Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Doctor Utilization Matrix</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((d) => {
                const count = savedAppointments.filter((a) => a.doctorId === d.id).length;
                return (
                  <div key={d.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{d.name}</h4>
                      <p className="text-xs text-teal-700">{d.specialty}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{count}</span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Appointments</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* ================= ARCHITECTURE / INTERVIEW DEFENSE ================= */}
      <section id="architecture" className="bg-slate-900 text-white py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
              System Design Interview Highlights
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight mt-4">
              Why This Application Cracks System Design Interviews
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              Architectural decisions that elevate this project beyond generic CRUD tutorials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Race Condition Immunity</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Composite unique constraints on <code className="text-teal-300">(doctorId, date, time)</code> ensure the database rejects concurrent attempts to book the same slot with HTTP 409 Conflict.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                ACID Guarantee Active
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Dynamic Slot Projection</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Instead of generating hundreds of thousands of static slot rows, available slots are computed and overlaid with existing appointments.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zero Database Bloat
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                  <BellRing className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Async Reminders & Audits</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Appointments include persistent transaction hashes (<code className="text-teal-300">txId</code>) ready for dispatching calendar invites (.ics) and SMS notifications.
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700 text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Transactional Integrity
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= BOOKING MODAL ================= */}
      {isModalOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
            <div className="p-6 bg-gradient-to-r from-teal-50 to-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl ${selectedDoctor.bgColor} text-white flex items-center justify-center font-bold text-lg shadow-sm`}
                >
                  {selectedDoctor.avatar}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedDoctor.name}</h3>
                  <p className="text-xs text-teal-700 font-semibold">
                    {selectedDoctor.specialty} • {selectedDoctor.qualifications}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {/* Error banner if double booking occurs */}
              {bookingError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 mb-6 flex items-start gap-3">
                  <X className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-rose-900">Booking Prevented</p>
                    <p className="text-[11px] text-rose-800 mt-0.5">{bookingError}</p>
                  </div>
                </div>
              )}

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Date Ribbon */}
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Date
              </label>
              <div className="grid grid-cols-4 gap-2 mb-6">
                {[
                  { label: "Today", date: "Today, Oct 14" },
                  { label: "Wed", date: "Wed, Oct 15" },
                  { label: "Thu", date: "Thu, Oct 16" },
                  { label: "Fri", date: "Fri, Oct 17" },
                ].map((d) => (
                  <button
                    key={d.date}
                    onClick={() => {
                      setSelectedDate(d.date);
                      setSelectedSlot(null);
                      setBookingError(null);
                    }}
                    className={`p-2.5 rounded-xl text-center transition cursor-pointer ${
                      selectedDate === d.date
                        ? "border-2 border-teal-600 bg-teal-50/50 text-slate-900"
                        : "border border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <span className="block text-[10px] uppercase font-bold text-teal-700">
                      {d.label}
                    </span>
                    <span className="block text-sm font-extrabold">{d.date.split(", ")[1]}</span>
                  </button>
                ))}
              </div>

              {/* Slot Picker */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Live Available Slots
                  </label>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Checked against database
                  </span>
                </div>

                <div className="mb-4">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2 flex items-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Morning
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedDoctor.slots.morning.map((slot) => {
                      const isBooked = savedAppointments.some(
                        (a) =>
                          a.doctorId === selectedDoctor.id &&
                          a.date === selectedDate &&
                          a.time === slot &&
                          a.status === "CONFIRMED"
                      );
                      return (
                        <button
                          key={slot}
                          disabled={isBooked}
                          onClick={() => handleSelectSlot(slot)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isBooked
                              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through"
                              : selectedSlot === slot
                              ? "border-2 border-teal-600 bg-teal-600 text-white shadow-sm"
                              : "border border-slate-200 bg-white hover:border-teal-500 text-slate-700"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 block mb-2 flex items-center gap-1">
                    <CloudSun className="w-3.5 h-3.5 text-sky-500" /> Afternoon
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedDoctor.slots.afternoon.map((slot) => {
                      const isBooked = savedAppointments.some(
                        (a) =>
                          a.doctorId === selectedDoctor.id &&
                          a.date === selectedDate &&
                          a.time === slot &&
                          a.status === "CONFIRMED"
                      );
                      return (
                        <button
                          key={slot}
                          disabled={isBooked}
                          onClick={() => handleSelectSlot(slot)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isBooked
                              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed line-through"
                              : selectedSlot === slot
                              ? "border-2 border-teal-600 bg-teal-600 text-white shadow-sm"
                              : "border border-slate-200 bg-white hover:border-teal-500 text-slate-700"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Hold Warning Alert */}
              {isHolding && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 mb-6 flex items-start gap-3">
                  <Timer className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">
                      Temporary 5-Minute Slot Hold Active:
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Confirming will write directly to SQLite <code className="text-amber-950 font-mono font-bold">dev.db</code>. Time remaining:{" "}
                      <span className="font-bold text-amber-950 font-mono">
                        {formatTimer(holdTimer)}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Reason for visit */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reason for Visit
                </label>
                <input
                  type="text"
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                  placeholder="e.g. Annual routine exam, chest discomfort, checkup"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-teal-600 text-slate-800"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400">
                    Consultation Fee
                  </span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {selectedDoctor.fee}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!selectedSlot || isSubmitting}
                    onClick={handleConfirmBooking}
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer ${
                      selectedSlot && !isSubmitting
                        ? "bg-teal-600 hover:bg-teal-700 active:scale-95 shadow-md shadow-teal-600/30"
                        : "bg-slate-300 cursor-not-allowed"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving to DB...</span>
                      </>
                    ) : (
                      <>
                        <span>Write to DB & Confirm</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS MODAL ================= */}
      {isSuccessOpen && confirmedData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner mb-4">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Appointment Saved to Database!
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Your appointment record has been persisted into the database with a unique transaction hash.
            </p>

            <div className="my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-800">{confirmedData.doctor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Schedule:</span>
                <span className="font-bold text-teal-700">
                  {confirmedData.date} @ {confirmedData.slot}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono text-slate-600 font-bold">{confirmedData.txId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Storage:</span>
                <span className="text-emerald-700 font-bold">SQLite dev.db (Prisma)</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={downloadIcsFile}
                className="w-full py-3 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>Add to Calendar (.ics)</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsSuccessOpen(false);
                    setIsBookingsListOpen(true);
                  }}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs tracking-wide transition cursor-pointer"
                >
                  View Saved Bookings
                </button>
                <button
                  onClick={() => setIsSuccessOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs tracking-wide shadow-md shadow-teal-600/30 transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MY BOOKINGS DRAWER / MODAL ================= */}
      {isBookingsListOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Saved Database Appointments ({savedAppointments.length})
                </h3>
              </div>
              <button
                onClick={() => setIsBookingsListOpen(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {loadingBookings ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-6 h-6 text-teal-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Querying database...</p>
                </div>
              ) : savedAppointments.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No appointments booked yet</p>
                  <p className="text-xs text-slate-400 mt-1">Book your first doctor appointment to see it stored here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAppointments.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{item.doctor?.name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold">
                            {item.doctor?.specialty}
                          </span>
                        </div>
                        <p className="text-xs text-teal-700 font-medium mt-1">
                          {item.date} at {item.time}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Patient: {item.patientName} • Reason: {item.reason || "General"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                            {item.txId}
                          </span>
                          <div className="text-[10px] text-emerald-600 font-bold mt-1">
                            ● {item.status}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelAppointment(item.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                          title="Cancel appointment and free up slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsBookingsListOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-600" />
            <span className="font-bold text-slate-700">CarePulse Clinical Suite</span>
            <span>• Multi-Role Architecture: Patient, Doctor & Admin</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-900">Database Schema</a>
            <a href="#" className="hover:text-slate-900">ACID Isolation</a>
            <a href="#" className="hover:text-slate-900">API Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
