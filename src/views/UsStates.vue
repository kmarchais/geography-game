<template>
  <div>
    <GeoGame :config="usStatesConfig" />
  </div>
</template>

<script setup lang="ts">
import GeoGame from "../components/GeoGame.vue";
import { usStatesConfig } from "../utils/gameConfigs";
</script>
