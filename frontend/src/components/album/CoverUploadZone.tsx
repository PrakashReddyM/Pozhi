import { useRef } from "react";
import UniversalUploadZone from "../ui/UniversalUploadZone";

interface CoverUploadZoneProps {
  label: string;
  image: string | null;
  onUpload: (url: string, file: File) => void;
  onClear: () => void;
  onFocus: () => void;
}

const CoverUploadZone = ({
  label,
  image,
  onUpload,
  onClear,
  onFocus,
}: CoverUploadZoneProps) => {

  return (
    <div onMouseEnter={onFocus}>
      <UniversalUploadZone
        label={label}
        image={image}
        onUpload={onUpload}
        onClear={onClear}
      />
    </div>
  );
};

export default CoverUploadZone;
