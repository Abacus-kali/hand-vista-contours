
import { HomeIcon } from "lucide-react";
import HandDetection from "./components/HandDetection";

export const navItems = [
  {
    title: "Hand Detection",
    to: "/",
    icon: <HomeIcon className="h-4 w-4" />,
    page: <HandDetection />,
  },
];
