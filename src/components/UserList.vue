<template>
    <div class="user-list-container">
      <h2>Registered Users</h2>

      <!-- Loading State -->
      <div v-if="isLoading" class="loading">Loading users...</div>

      <!-- Error State -->
      <div v-else-if="error" class="error-message">
        Error loading users: {{ error }}
      </div>

      <!-- No Users State -->
      <div v-else-if="users.length === 0" class="no-users">
        No users found in the database.
      </div>

      <!-- User Table -->
      <table v-else class="user-table">
        <thead>
          <tr>
            <th>Avatar</th>
            <th>Name</th>
            <th>Email</th>
            <th>Last Login</th>
            <th>Registered</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>
              <img
                v-if="user.profile_picture_url"
                :src="user.profile_picture_url"
                alt="User avatar"
                class="avatar"
                width="40"
                height="40"
              />
              <!-- Adjusted no-avatar for better contrast -->
              <span v-else class="no-avatar">?</span>
            </td>
            <td>{{ user.name || "N/A" }}</td>
            <td>{{ user.email }}</td>
            <td>{{ formatDateTime(user.last_login) }}</td>
            <td>{{ formatDateTime(user.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>

  <script setup lang="ts">
  import { ref, onMounted } from "vue";

  // Define the structure of a user object based on backend response
  interface User {
    id: number;
    email: string;
    name: string | null;
    profile_picture_url: string | null;
    created_at: string; // ISO date string from backend
    last_login: string; // ISO date string from backend
  }

  const users = ref<User[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Construct the API URL (use environment variable if available)
  const API_BASE_URL =
    import.meta.env.VITE_BACKEND_API_URL?.replace("/api/auth/google", "") ||
    "http://localhost:5000"; // Adjust default if needed
  const USERS_API_URL = `${API_BASE_URL}/api/users`;

  // Fetch users when the component is mounted
  onMounted(async () => {
    await fetchUsers();
  });

  async function fetchUsers() {
    isLoading.value = true;
    error.value = null;
    users.value = []; // Clear previous users

    try {
      const response = await fetch(USERS_API_URL);

      if (!response.ok) {
        let errorMsg = `HTTP error! Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg += `: ${errorData.error || response.statusText}`;
        } catch (e) {
          /* Ignore */
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      users.value = data as User[];
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      error.value = err.message || "An unknown error occurred.";
    } finally {
      isLoading.value = false;
    }
  }

  // Helper function to format date/time strings
  function formatDateTime(isoString: string | null): string {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch (e) {
      return "Invalid Date";
    }
  }
  </script>

  <style scoped>
  /* Dark Theme Styles */
  .user-list-container {
    padding: 20px;
    font-family: sans-serif;
    max-width: 900px;
    margin: 20px auto;

    /* Dark background */
    background-color: #2d3748; /* Slightly lighter than pure black */
    color: #e2e8f0; /* Light text */
    border-radius: 8px;

    /* Adjusted shadow for dark theme */
    box-shadow: 0 4px 6px rgb(0 0 0 / 30%);
  }

  h2 {
    text-align: center;

    /* Lighter text for heading */
    color: #f7fafc;
    margin-bottom: 20px;
  }

  .loading,
  .error-message,
  .no-users {
    text-align: center;
    padding: 20px;

    /* Slightly dimmer text for states */
    color: #a0aec0;
  }

  .error-message {
    /* Dark red background */
    background-color: #4a1d1f;

    /* Lighter red text */
    color: #fed7d7;

    /* Darker red border */
    border: 1px solid #9b2c2c;
    border-radius: 4px;
  }

  .user-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
  }

  .user-table th,
  .user-table td {
    /* Darker border */
    border: 1px solid #4a5568;
    padding: 10px 12px;
    text-align: left;
    vertical-align: middle;

    /* Ensure text color is light */
    color: #e2e8f0;
  }

  .user-table th {
    /* Slightly lighter dark background for header */
    background-color: #4a5568;
    font-weight: 700;

    /* Brighter text for header */
    color: #f7fafc;
  }

  .user-table tbody tr:nth-child(even) {
    /* Slightly different dark background for striping */
    background-color: #27303f;
  }

  .user-table tbody tr:hover {
    /* Hover effect */
    background-color: #4a5568;
  }

  .avatar {
    border-radius: 50%;
    width: 40px;
    height: 40px;
    object-fit: cover;
    vertical-align: middle;

    /* Optional: Add a subtle border to avatars */
    border: 1px solid #4a5568;
  }

  .no-avatar {
    display: inline-block;
    width: 40px;
    height: 40px;
    line-height: 40px;
    text-align: center;
    border-radius: 50%;

    /* Darker grey background */
    background-color: #4a5568;

    /* Light text */
    color: #e2e8f0;
    font-weight: 700;
    vertical-align: middle;
  }
  </style>
