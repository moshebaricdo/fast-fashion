import { DetailStackLayout } from "@/components/DetailStackLayout";
import { DrawerNavigationProvider } from "@/contexts/DrawerNavigationContext";

export default function FavoritesLayout({
  children,
  detail,
}: {
  children: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <DrawerNavigationProvider>
      <DetailStackLayout list={children} detail={detail} rootPath="/favorites" />
    </DrawerNavigationProvider>
  );
}
