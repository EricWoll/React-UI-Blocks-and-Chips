import { useNavBar } from '@/components/ui/navigationBar/navigationBar.contexts';

export default function NavHeader({ children }: { children: React.ReactNode }) {
    const { headerElementRef } = useNavBar();

    return <header ref={headerElementRef}></header>;
}
