import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import { Calendar } from "./components/Calendar";

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <Calendar />
    </MantineProvider>
  );
}
