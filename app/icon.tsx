import { ImageResponse } from "next/og";

export const alt = "GymGenie";
export const size = {
  width: 40,
  height: 40,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111613",
          borderRadius: "7px",
          border: "1px solid rgba(255,255,255,0.16)",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M7 15.5L10.5 9.5L13.5 13L17 8"
            stroke="#C6FF4D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10.5" cy="9.5" r="1.75" fill="#F5F7F2" />
          <circle cx="17" cy="8" r="1.75" fill="#C6FF4D" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
