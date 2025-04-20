<template>
  <div class="game-selection">
    <v-card
      v-for="game in games"
      :key="game.name"
      class="game-card"
      @click="onGameSelect(game.route)"
    >
      <v-card-title>{{ game.name }}</v-card-title>
      <v-card-text>{{ game.description }}</v-card-text>
      <v-card-actions>
        <v-btn color="primary" variant="outlined">Play</v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
interface GameOption {
  name: string;
  description: string;
  route: string;
}

const props = defineProps<{
  games: GameOption[];
}>();

const emit = defineEmits<{
  (e: "select", route: string): void;
}>();

const onGameSelect = (route: string) => {
  emit("select", route);
};
</script>

<style scoped>
.game-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.game-card {
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  height: 100%;
}

.game-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.1);
}
</style>
