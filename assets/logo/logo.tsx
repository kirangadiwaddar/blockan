import type { SVGAttributes } from "react";

const LogoMark = ({ size = 28, ...props }: Omit<SVGAttributes<SVGElement>, "width" | "height"> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width={size} height={size} {...props}>
    <rect x="0" y="0" width="300" height="300" rx="67" fill="#FF1616"/>
    <circle cx="94"  cy="94"  r="22" fill="white"/>
    <circle cx="150" cy="94"  r="22" fill="white"/>
    <circle cx="206" cy="94"  r="22" fill="white"/>
    <circle cx="94"  cy="150" r="22" fill="white"/>
    <circle cx="150" cy="150" r="22" fill="white"/>
    <circle cx="206" cy="150" r="22" fill="white" opacity="0.25"/>
    <circle cx="94"  cy="206" r="22" fill="white"/>
    <circle cx="150" cy="206" r="22" fill="white" opacity="0.25"/>
    <circle cx="206" cy="206" r="22" fill="white" opacity="0.25"/>
  </svg>
);

export { LogoMark };

const Logo = () => {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={32} />
      <span className="text-xl capitalize font-semibold tracking-tight">Blockan</span>
    </div>
  );
};

export default Logo;
