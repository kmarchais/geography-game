<template>
  <div>
    <GeoGame :config="frenchDepartmentsConfig" />
  </div>
</template>

<script setup lang="ts">
import GeoGame from "../components/GeoGame.vue";
import { frenchDepartmentsConfig } from "../utils/gameConfigs";
</script>
