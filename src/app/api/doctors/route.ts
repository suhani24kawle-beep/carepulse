import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INITIAL_DOCTORS = [
  {
    id: "doc-1",
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiology",
    qualifications: "MD, FACC • Harvard Medical",
    experience: "14 yrs",
    rating: 4.9,
    fee: "$150",
    avatar: "SJ",
    bgColor: "bg-teal-600",
    hospital: "City Heart Center, New York",
    availableSlots: JSON.stringify({
      morning: ["09:00 AM", "09:30 AM", "10:00 AM", "11:00 AM"],
      afternoon: ["02:00 PM", "02:30 PM", "03:30 PM", "04:30 PM"],
    }),
  },
  {
    id: "doc-2",
    name: "Dr. Marcus Vance",
    specialty: "Dermatology",
    qualifications: "MD, FAAD • Johns Hopkins",
    experience: "11 yrs",
    rating: 4.8,
    fee: "$120",
    avatar: "MV",
    bgColor: "bg-indigo-600",
    hospital: "Metro Skin & Laser Clinic",
    availableSlots: JSON.stringify({
      morning: ["10:30 AM", "11:30 AM"],
      afternoon: ["02:00 PM", "02:30 PM", "04:00 PM"],
    }),
  },
  {
    id: "doc-3",
    name: "Dr. Elena Rostova",
    specialty: "Neurology",
    qualifications: "MD, PhD • Stanford Medicine",
    experience: "18 yrs",
    rating: 5.0,
    fee: "$200",
    avatar: "ER",
    bgColor: "bg-purple-600",
    hospital: "Brain Health Institute",
    availableSlots: JSON.stringify({
      morning: ["09:30 AM", "10:30 AM"],
      afternoon: ["03:00 PM", "03:30 PM", "04:00 PM"],
    }),
  },
  {
    id: "doc-4",
    name: "Dr. David Kim",
    specialty: "Pediatrics",
    qualifications: "MD, FAAP • Columbia Univ",
    experience: "9 yrs",
    rating: 4.9,
    fee: "$100",
    avatar: "DK",
    bgColor: "bg-emerald-600",
    hospital: "Children First Wellness",
    availableSlots: JSON.stringify({
      morning: ["09:00 AM", "11:00 AM", "11:30 AM"],
      afternoon: ["01:30 PM", "02:00 PM", "03:00 PM"],
    }),
  },
  {
    id: "doc-5",
    name: "Dr. Aisha Patel",
    specialty: "Orthopedics",
    qualifications: "MS, MCh Ortho • Mayo Clinic",
    experience: "16 yrs",
    rating: 4.9,
    fee: "$175",
    avatar: "AP",
    bgColor: "bg-sky-600",
    hospital: "Apex Joint & Spine Hospital",
    availableSlots: JSON.stringify({
      morning: ["10:00 AM", "11:30 AM"],
      afternoon: ["02:30 PM", "03:00 PM", "04:00 PM"],
    }),
  },
  {
    id: "doc-6",
    name: "Dr. Robert Sterling",
    specialty: "Cardiology",
    qualifications: "MD, FESC • Oxford Radcliffe",
    experience: "21 yrs",
    rating: 4.8,
    fee: "$190",
    avatar: "RS",
    bgColor: "bg-teal-700",
    hospital: "Prestige Cardiac Care",
    availableSlots: JSON.stringify({
      morning: ["10:00 AM", "11:00 AM"],
      afternoon: ["01:00 PM", "03:30 PM"],
    }),
  },
];

export async function GET() {
  try {
    let doctors = await prisma.doctor.findMany({
      include: { appointments: true },
    });

    // Auto-seed if the database is initially empty
    if (doctors.length === 0) {
      for (const d of INITIAL_DOCTORS) {
        await prisma.doctor.upsert({
          where: { id: d.id },
          update: {},
          create: d,
        });
      }
      doctors = await prisma.doctor.findMany({
        include: { appointments: true },
      });
    }

    const formatted = doctors.map((doc) => ({
      ...doc,
      slots: JSON.parse(doc.availableSlots),
      bookedSlots: doc.appointments.map((a) => `${a.date}-${a.time}`),
    }));

    return NextResponse.json({ success: true, doctors: formatted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
