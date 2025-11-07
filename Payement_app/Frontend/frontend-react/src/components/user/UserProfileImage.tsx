import { Image } from "react-bootstrap";
import defaultAvatar from "@/assets/profileImage.png";

type UserProfileImageProps = {
  previewUrl: string | null; // URL for the profile image to display
  height?: number; // height for the image
  width?: number; //  width for the image
};

export default function UserProfileImage({
  previewUrl, height, width
}: UserProfileImageProps) {
  return (
    <Image
      src={previewUrl || defaultAvatar}
      alt="Preview"
      className="object-fit-cover"
      roundedCircle
      width={height || 150}
      height={width || 150}
    />
  );
}
