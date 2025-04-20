<template>
  <div>
    <GeoGame :config="worldCountriesConfig" />
  </div>
</template>

<script setup lang="ts">
import GeoGame from "../components/GeoGame.vue";
import { worldCountriesConfig } from "../utils/gameConfigs";
</script>
