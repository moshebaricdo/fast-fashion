import {
  Heart,
  LayoutGrid,
  Shirt,
  type LucideProps,
} from "lucide-react";

export {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Filter,
  Heart,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Shirt,
  Shuffle,
  SportShoe,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

export { Trousers } from "@/components/icons/Trousers";

export function HeartFilled(props: LucideProps) {
  return <Heart fill="currentColor" strokeWidth={0} {...props} />;
}

export function ShirtFilled(props: LucideProps) {
  return <Shirt fill="currentColor" strokeWidth={0} {...props} />;
}

export function LayoutGridFilled(props: LucideProps) {
  return <LayoutGrid fill="currentColor" strokeWidth={0} {...props} />;
}
