type TokenLogoProps = {
  size?: number;
  decorative?: boolean;
};

/** Official DARIC token mark. The 100plan app mark is a separate asset. */
export function TokenLogo({ size = 24, decorative = false }: TokenLogoProps) {
  return (
    <img
      src="/daric-token-512.png"
      alt={decorative ? "" : "DARIC Token"}
      aria-hidden={decorative || undefined}
      className="token-logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
