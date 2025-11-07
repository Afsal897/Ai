import { UserTypes } from "@/constants/enum";
import UserAccountVerify from "@/components/user/UserAccountVerify";
import UserPasswordVerify from "@/components/user/UserPasswordVerify";
import { useMyContext } from "@/context/ContactContext";

export default function PasswordResetPage() {
  const { user } = useMyContext(); //i18n variable declaration

  const isPasswordType = [
    UserTypes.PASSWORD_ONLY,
    UserTypes.SSO_AND_PASSWORD,
  ].includes(user?.signup_type as UserTypes);

  return isPasswordType ? <UserPasswordVerify /> : <UserAccountVerify />;
}
