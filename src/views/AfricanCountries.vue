<template>
  <div>
    <GeoGame :config="africanCountriesConfig" />
  </div>
</template>

<script setup lang="ts">
import GeoGame from "../components/GeoGame.vue";
import { africanCountriesConfig } from "../utils/gameConfigs";
</script>
