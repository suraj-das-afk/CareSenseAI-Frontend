import api from "./api";
import { auth } from "../../firebaseConfig";

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("User not logged in");
  return await user.getIdToken();
};

export const AppointmentsService = {
  // 📥 Get all appointments
  async getAppointments() {
    const token = await getToken();

    const res = await api.get("/api/v1/appointments/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  },

  // ❌ Cancel appointment (PATCH, not POST)
  async cancelAppointment(id) {
    const token = await getToken();

    await api.patch(
      `/api/v1/appointments/${id}/`,
      { status: "cancelled" },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return true;
  },

  // 🔁 Reschedule / Update appointment
  async updateAppointment(id, payload) {
    const token = await getToken();

    const res = await api.patch(
      `/api/v1/appointments/${id}/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res.data;
  },

  // ➕ Create appointment
  async createAppointment(payload) {
    const token = await getToken();

    const res = await api.post("/api/v1/appointments/", payload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  },
};
