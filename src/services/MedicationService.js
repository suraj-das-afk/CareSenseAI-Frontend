import api from "./api";
import { auth } from "../../firebaseConfig";

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  return await user.getIdToken();
};

export const MedicationService = {
  async getMedication(recordId) {
    const token = await getToken();

    const res = await api.get(
      `/api/v1/records/${recordId}/medication/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res.data;
  },
};
