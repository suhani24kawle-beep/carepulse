import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      include: { doctor: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, appointments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctorId, date, time, reason, patientName, patientEmail } = body;

    if (!doctorId || !date || !time) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (doctorId, date, time)" },
        { status: 400 }
      );
    }

    // 1. Application-level check
    const existing = await prisma.appointment.findFirst({
      where: {
        doctorId,
        date,
        time,
        status: "CONFIRMED",
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Double-Booking Conflict: This slot has already been booked by another patient.",
        },
        { status: 409 }
      );
    }

    // 2. Insert appointment record (Guarded by composite unique constraint: @@unique([doctorId, date, time]))
    const txId = "TXN-" + Math.floor(100000 + Math.random() * 900000);
    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        date,
        time,
        reason: reason || "General Medical Consultation",
        patientName: patientName || "Alex Johnson",
        patientEmail: patientEmail || "alex.johnson@example.com",
        status: "CONFIRMED",
        txId,
      },
      include: { doctor: true },
    });

    return NextResponse.json({ success: true, appointment, txId }, { status: 201 });
  } catch (error: any) {
    // Handle Prisma P2002: Unique constraint failed
    if (error.code === "P2002" || error.message?.includes("Unique constraint failed")) {
      return NextResponse.json(
        {
          success: false,
          error: "Double-Booking Conflict: Race condition intercepted by database unique constraint.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (id, status)" },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: { doctor: true },
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing appointment id parameter" },
        { status: 400 }
      );
    }

    await prisma.appointment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled and slot released successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
