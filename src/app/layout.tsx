import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'React UI Blocks and Chips',
    description: 'Reusable UI blocks and chips for React Typescript.',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
