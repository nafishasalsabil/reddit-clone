interface AvatarProps {
  uid: string
  size?: number
  photoURL?: string
  displayName?: string
}

// Generate a deterministic color based on UID (same user = same color)
function getColorFromUID(uid: string): { bg: string; snoo: string } {
  // Hash the UID to get consistent colors
  let hash = 0
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Generate background color (lighter shade)
  const hue1 = Math.abs(hash) % 360
  const sat1 = 30 + (Math.abs(hash) % 30) // 30-60% saturation
  const light1 = 85 + (Math.abs(hash) % 10) // 85-95% lightness
  
  // Generate Snoo color (darker, more saturated)
  const hue2 = (hue1 + 30) % 360 // Slightly different hue
  const sat2 = 60 + (Math.abs(hash >> 8) % 30) // 60-90% saturation
  const light2 = 50 + (Math.abs(hash >> 16) % 20) // 50-70% lightness
  
  return {
    bg: `hsl(${hue1}, ${sat1}%, ${light1}%)`,
    snoo: `hsl(${hue2}, ${sat2}%, ${light2}%)`
  }
}

// Generate Reddit Snoo SVG
function generateSnooAvatar(uid: string, size: number): string {
  const colors = getColorFromUID(uid)
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="circle-${uid}">
          <circle cx="20" cy="20" r="20"/>
        </clipPath>
      </defs>
      <circle cx="20" cy="20" r="20" fill="${colors.bg}"/>
      <g clip-path="url(#circle-${uid})">
        <!-- Snoo body (oval) -->
        <ellipse cx="20" cy="26" rx="9" ry="11" fill="${colors.snoo}"/>
        <!-- Snoo head (larger oval) -->
        <ellipse cx="20" cy="13" rx="8" ry="9" fill="${colors.snoo}"/>
        <!-- Snoo eyes (white circles) -->
        <circle cx="17" cy="12" r="2" fill="white"/>
        <circle cx="23" cy="12" r="2" fill="white"/>
        <!-- Snoo antenna base -->
        <ellipse cx="20" cy="6" rx="2.5" ry="3" fill="${colors.snoo}"/>
        <!-- Snoo antenna stem -->
        <line x1="20" y1="6" x2="20" y2="9" stroke="${colors.snoo}" stroke-width="2" stroke-linecap="round"/>
        <!-- Online indicator (small green circle in bottom-right) -->
        <circle cx="32" cy="32" r="3.5" fill="#22c55e" stroke="${colors.bg}" stroke-width="1.5"/>
      </g>
    </svg>
  `.trim()
}

export default function Avatar({ uid, size = 32, photoURL, displayName }: AvatarProps) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt={displayName || uid}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full rounded-full"
          dangerouslySetInnerHTML={{ __html: generateSnooAvatar(uid, size) }}
        />
      )}
    </div>
  )
}

