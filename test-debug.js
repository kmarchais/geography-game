import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const TestComponent = defineComponent({
  name: "Test",
  template: "<div>Test</div>",
});

const wrapper = mount(TestComponent);
console.log("Mounted successfully!");
