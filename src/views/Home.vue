<template>
  <div class="home-container">
    <h1 class="home-title">Geography Game</h1>
    <p class="home-description">
      Test your geography knowledge with our interactive map games! Choose from
      the game modes below.
    </p>

    <HomeGameSelection :games="gameOptions" @select="navigateTo" />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import HomeGameSelection from "../components/HomeGameSelection.vue";

const router = useRouter();

const gameOptions = [
  {
    name: "World Countries",
    description:
      "Learn the countries of the world. Can you locate all 241 territories?",
    route: "/world",
  },
  {
    name: "US States",
    description: "Test your knowledge of the 50 US States and their locations.",
    route: "/us-states",
  },
  {
    name: "French Departments",
    description:
      "Learn the departments of France, including overseas territories.",
    route: "/french-departments",
  },
  {
    name: "African Countries",
    description:
      "Challenge yourself with the countries of Africa. Can you find all 54?",
    route: "/african-countries",
  },
];

const navigateTo = (route: string) => {
  router.push(route);
};
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.home-title {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 1rem;
}

.home-description {
  text-align: center;
  font-size: 1.2rem;
  margin-bottom: 3rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}
</style>
