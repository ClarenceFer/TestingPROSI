import axios from "axios";
import authHeader from "./auth-header";

// gunakan URL dari environment variable
const API_URL = `${import.meta.env.VITE_API_URL}/api/`;

class UserService {
  // Admin functions
  getUsers() {
    return axios.get(API_URL + "users", { headers: authHeader() });
  }

  createUser(userData) {
    return axios.post(API_URL + "users", userData, { headers: authHeader() });
  }

  updateUser(id, userData) {
    return axios.put(API_URL + "users/" + id, userData, { headers: authHeader() });
  }

  deleteUser(id) {
    return axios.delete(API_URL + "users/" + id, { headers: authHeader() });
  }
}

export default new UserService();
