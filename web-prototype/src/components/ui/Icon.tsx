import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";

export type IconComponent = ComponentType<LucideProps>;

export type IconProps = LucideProps & {
  icon: IconComponent;
  size?: number;
};

export function Icon({
  icon: IconComponent,
  size = 22,
  strokeWidth = 1.5,
  ...props
}: IconProps) {
  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
}
