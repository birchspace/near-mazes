import Wave from "react-wavify";
import { Navbar } from "~/components/header/navbar";
import Mazes from "~/components/maze";

export default function HomePage() {
  return (
    <main className="relative flex h-full min-h-screen flex-col border">
      <Navbar />

      <Mazes />

      <Wave
        className=" absolute bottom-0 -z-50"
        fill="#363636"
        paused={false}
        style={{ display: "flex" }}
        options={{
          height: 20,
          amplitude: 120,
          speed: 0.125,
          points: 7,
        }}
      />
    </main>
  );
}
