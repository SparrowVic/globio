# @globiojs/vue

Vue 3 component for `@globiojs/core`. Core configuration is exposed through props, engine events through Vue emits, and the component ref provides access to the underlying globe instance.

## Installation

```bash
npm install @globiojs/vue @globiojs/core vue three
```

## Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { VueGlobe } from '@globiojs/vue';

const globe = ref<InstanceType<typeof VueGlobe> | null>(null);
</script>

<template>
  <VueGlobe
    ref="globe"
    kind="outline"
    theme="outline-dark"
    :markers="[
      { id: 'warsaw', position: [52.23, 21.01], label: 'Warsaw' },
    ]"
    style="width: 100%; height: 520px"
    @marker-click="({ marker }) => console.log(marker.id)"
  />
</template>
```

Use `globe.value?.getInstance()` for imperative APIs such as `flyTo`, data layers, legends, and stories.

See the [GlobioJS repository](https://github.com/SparrowVic/globiojs) for the full Vue guide and API reference.
