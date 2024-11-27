import { SVGProps } from "react";
const BotIcon = (props: SVGProps<SVGSVGElement>) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        width="100%"
        height="100%"
        {...props}
    >
        <g id="SVGRepo_bgCarrier" strokeWidth={0} />
        <g
            id="SVGRepo_tracerCarrier"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <g id="SVGRepo_iconCarrier">
            <rect x={3} y={11} width={18} height={10} rx={2} />
            <circle cx={12} cy={5} r={2} />
            <path d="M12 7v4" />
            <line x1={8} y1={16} x2={8} y2={16} />
            <line x1={16} y1={16} x2={16} y2={16} />
        </g>
    </svg>
);
export default BotIcon;
