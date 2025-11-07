import { useEffect, useRef } from "react";

const AlwaysScrollIntoView = () => {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    elementRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return <div ref={elementRef} />;
};

export default AlwaysScrollIntoView;
