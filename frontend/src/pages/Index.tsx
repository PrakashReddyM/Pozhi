import { useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
// import Studio from "./Studio";
import HomePage from "./HomePage";

const Index = memo(() => {
  const { isAuthenticated, completeGoogleLoginWithHash } = useAuth();
  const navigate = useNavigate();

  // Handle OAuth redirect hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      completeGoogleLoginWithHash(hash).catch((err) =>
        console.error("OAuth handle failed", err)
      );
    }
  }, [completeGoogleLoginWithHash]);

  // Authenticated users used to go straight to the studio. Everyone now lands on
  // HomePage; the studio stays reachable at /studio.
  // if (isAuthenticated) {
  //   return <Studio />;
  // }

  return <HomePage />;
});

Index.displayName = "Index";

export default Index;
