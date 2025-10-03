import axios from "axios";
import authHeader from "./auth-header";

// gunakan URL dari environment variable
const API_URL = `${import.meta.env.VITE_API_URL}/api/`;

class MaterialTagService {
  // Get all material tags
  getAllMaterialTag() {
    return axios.get(API_URL + "material-tags", { headers: authHeader() });
  }

  // Create new material tag (admin only)
  createMaterialTag(tagData) {
    return axios.post(API_URL + "material-tags", tagData, { headers: authHeader() });
  }

  // Update material tag (admin only)
  updateMaterialTag(id, tagData) {
    return axios.put(API_URL + "material-tags/" + id, tagData, { headers: authHeader() });
  }

  // Delete material tag (admin only)
  deleteMaterialTag(id) {
    return axios.delete(API_URL + "material-tags/" + id, { headers: authHeader() });
  }
}

export default new MaterialTagService();
