<template>
  <v-container>
    <h1 class="mb-4">
      Admin Dashboard - User List
    </h1>

    <!-- Loading Indicator -->
    <v-row
      v-if="isLoading"
      justify="center"
      class="mt-10"
    >
      <v-progress-circular
        indeterminate
        color="primary"
        size="64"
      />
    </v-row>

    <!-- Error Message -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      @click:close="error = null"
    >
      {{ error }}
    </v-alert>

    <!-- User Table -->
    <v-card
      v-if="!isLoading && !error"
      flat
    >
      <v-card-title v-if="!users.length">
        No users found.
      </v-card-title>
      <v-table
        v-if="users.length"
        density="compact"
        hover
      >
        <thead>
          <tr>
            <th class="text-left">
              ID
            </th>
            <th class="text-left">
              Name
            </th>
            <th class="text-left">
              Email
            </th>
            <th class="text-left">
              Admin?
            </th>
            <th class="text-left">
              Last Login
            </th>
            <th class="text-left">
              Joined
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in users"
            :key="user.id"
          >
            <td>{{ user.id }}</td>
            <td>
              <v-avatar
                size="x-small"
                class="mr-2"
              >
                <v-img
                  :src="user.profile_picture_url ?? ''"
                  :alt="user.name"
                />
              </v-avatar>
              {{ user.name }}
            </td>
            <td>{{ user.email }}</td>
            <td>
              <v-icon
                :color="user.is_admin ? 'success' : 'grey'"
                size="small"
              >
                {{ user.is_admin ? 'mdi-check-circle' : 'mdi-circle-outline' }}
              </v-icon>
              <!-- {{ user.is_admin ? 'Yes' : 'No' }} -->
            </td>
            <td>{{ formatDateTime(user.last_login) }}</td>
            <td>{{ formatDate(user.created_at) }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

  <script setup lang="ts">
    import { ref, onMounted } from 'vue';
    import { useAuth } from '@/composables/useAuth'; // Adjust path if needed

    // Define the structure of a user object based on backend response
    interface User {
      id: number;
      google_id: string; // Assuming backend sends this too
      email: string;
      name: string;
      profile_picture_url: string | null;
      created_at: string; // Dates will likely be ISO strings
      last_login: string;
      is_admin: boolean;
    }

    const { accessToken } = useAuth(); // Get the reactive access token

    const users = ref<User[]>([]); // Store the list of users
    const isLoading = ref(false); // Loading state indicator
    const error = ref<string | null>(null); // Error message holder

    // Get the base API URL from environment variables
    const BASE_API_URL = import.meta.env.VITE_BACKEND_API_URL;
    const USERS_ENDPOINT_URL = BASE_API_URL ? `${BASE_API_URL}/users` : '/api/users';

    // Function to fetch users from the backend
    const fetchUsers = async () => {
      isLoading.value = true;
      error.value = null;
      users.value = []; // Clear previous users

      if (!accessToken.value) {
        error.value = 'Authentication token not found. Please log in.';
        isLoading.value = false;
        return;
      }

      if (!BASE_API_URL) {
         console.warn("VITE_BACKEND_API_URL is not set. Using fallback /api/users.");
      }
      console.log(`Fetching users from: ${USERS_ENDPOINT_URL}`);

      try {
        const response = await fetch(USERS_ENDPOINT_URL, {
          method: 'GET',
          headers: {
            // Crucially include the Authorization header
            'Authorization': `Bearer ${accessToken.value}`,
            'Accept': 'application/json', // Indicate we expect JSON
          },
        });

        if (!response.ok) {
          let errorMsg = `Failed to fetch users: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMsg += ` - ${errorData.message || 'No specific error message from backend.'}`;
          } catch (_e) {
            // Ignore if response body is not JSON
          }
          throw new Error(errorMsg);
        }

        const rawData = await response.json();
        users.value = rawData.map((row: any[]) => ({
            id: row[0],
            email: row[1],
            name: row[2],
            profile_picture_url: row[3],
            created_at: row[4],
            last_login: row[5],
            is_admin: row[6]
        }));
        console.log('User object structure:', users.value[0]); // Log the first user object
        console.log(`Successfully fetched ${users.value.length} users.`);

      } catch (err: any) {
        console.error('Error fetching users:', err);
        error.value = err.message || 'An unexpected error occurred while fetching users.';
      } finally {
        isLoading.value = false;
      }
    };

    // Helper function to format date/time strings (basic example)
    const formatDateTime = (dateString: string | null | undefined): string => {
      if (!dateString) {return 'N/A';}
      try {
        const date = new Date(dateString);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      } catch (_e) {
        return 'Invalid Date';
      }
    };
    // Helper function to format date strings (basic example)
    const formatDate = (dateString: string | null | undefined): string => {
      if (!dateString) {return 'N/A';}
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
      } catch (_e) {
        return 'Invalid Date';
      }
    };


    // Fetch users when the component is mounted
    onMounted(() => {
      fetchUsers();
    });
  </script>

  <style scoped>
  /* Add any specific styles for your dashboard here */
  h1 {
    color: rgb(var(--v-theme-on-surface)); /* Adapt title color to theme */
  }
  </style>
