import axios from "axios";

console.log("API_URL =", process.env.VITE_API_URL);
const API_URL = `${import.meta.env.VITE_API_URL}/api/auth/`;
console.log("Full API URL for signin:", API_URL + "signin");

console.log(import.meta.env.VITE_API_URL);
console.log(typeof import.meta.env.VITE_API_URL); // string




class AuthService {
  login(email, password) {
    console.log("Attempting login with:", { email, password: "***" });
    return axios
      .post(API_URL + "signin", {
        email,
        password
      })
      .then(response => {
        console.log("Login response:", response.data);
        if (response.data.accessToken) {
          localStorage.setItem("user", JSON.stringify(response.data));
        }
        return response.data;
      });
  }

  logout() {
    localStorage.removeItem("user");
  }

  getCurrentUser() {
    return JSON.parse(localStorage.getItem("user"));
  }
}

export default new AuthService();
