"use client"
import Image from "next/image"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

export function AppSidebar() {
  const { theme, setTheme } = useTheme();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image 
                src={'/logo.svg'} 
                alt="logo" 
                width={60} 
                height={60}
                className="w-[40px] h-[40px]"
              />
              <h2 className="font-bold text-xl">Mirhas Studio</h2>
              
              <div>
                {theme === 'light' ? (
                  <Button variant={'ghost'} size={'icon'} onClick={() => setTheme('dark')}>
                    <Sun className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button variant={'ghost'} size={'icon'} onClick={() => setTheme('light')}>
                    <Moon className={'text-yellow-400 h-5 w-5'} />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Button className='mt-7 w-full' size="lg">+ New Chat</Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className={'p-3'}/>
        <h2 className="font-bold text-lg ">Chat</h2>
        <p className="text-base text-gray-400">Sign in to  start chating with multiple AI models</p>
        <SidebarGroup/ >
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 mb-10">
          <Button className={'w-full'} size="lg">Sign In/Sign Up</Button>
        </div>
      </SidebarFooter> {/* FIXED: Changed from <SidebarFooter/> to </SidebarFooter> */}
    </Sidebar>
  )
}