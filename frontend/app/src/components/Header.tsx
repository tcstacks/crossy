import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, History as HistoryIcon, LogOut, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from './AuthModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const handleLoginClick = () => {
    setAuthModalOpen(true);
    setIsOpen(false);
  };

  // Check if a navigation link is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Get link class based on active state
  const getLinkClass = (path: string) => {
    const baseClass = "font-display font-medium text-sm transition-colors";
    return isActive(path)
      ? `${baseClass} text-[#7B61FF] font-bold`
      : `${baseClass} text-[#6B5CA8] hover:text-[#7B61FF]`;
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#ECE9FF] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative">
                <img
                  src="/crossy-small.png"
                  alt="Crossy"
                  className="w-10 h-10 group-hover:scale-110 transition-transform"
                />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#7B61FF] rounded-full animate-pulse" />
              </div>
              <span className="font-pixel text-sm text-[#2A1E5C]">Crossy</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link to="/play" className={getLinkClass('/play')}>
                Play
              </Link>
              <Link to="/archive" className={getLinkClass('/archive')}>
                Archive
              </Link>
              <Link to="/room/create" className={getLinkClass('/room/create')}>
                Multiplayer
              </Link>
              <Link to="/profile" className={getLinkClass('/profile')}>
                Profile
              </Link>
              <Link to="/history" className={getLinkClass('/history')}>
                History
              </Link>

              {isAuthenticated && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F3F1FF] hover:bg-[#ECE9FF] transition-colors">
                      <div className="flex items-center gap-2">
                        <img
                          src="/crossy-small.png"
                          alt="Crossy"
                          className="w-5 h-5"
                        />
                        <div className="w-7 h-7 rounded-full bg-[#7B61FF] flex items-center justify-center text-white font-display font-bold text-sm">
                          {(user.displayName || 'G')[0].toUpperCase()}
                        </div>
                      </div>
                      <span className="font-display font-medium text-sm text-[#2A1E5C]">
                        {user.displayName || 'Guest'}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/history" className="flex items-center gap-2">
                        <HistoryIcon className="w-4 h-4" />
                        <span>History</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} variant="destructive">
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={handleLoginClick}
                  className="crossy-button text-sm py-2 px-4"
                >
                  Login
                </Button>
              )}
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-[#F3F1FF] text-[#2A1E5C]"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {isOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-t border-[#ECE9FF] px-4 py-4 shadow-lg">
              <div className="flex flex-col gap-3">
                <Link
                  to="/play"
                  onClick={() => setIsOpen(false)}
                  className={`font-display font-medium py-2 ${isActive('/play') ? 'text-[#7B61FF] font-bold' : 'text-[#2A1E5C]'}`}
                >
                  Play
                </Link>
                <Link
                  to="/archive"
                  onClick={() => setIsOpen(false)}
                  className={`font-display font-medium py-2 ${isActive('/archive') ? 'text-[#7B61FF] font-bold' : 'text-[#2A1E5C]'}`}
                >
                  Archive
                </Link>
                <Link
                  to="/room/create"
                  onClick={() => setIsOpen(false)}
                  className={`font-display font-medium py-2 ${isActive('/room/create') ? 'text-[#7B61FF] font-bold' : 'text-[#2A1E5C]'}`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Multiplayer
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className={`font-display font-medium py-2 ${isActive('/profile') ? 'text-[#7B61FF] font-bold' : 'text-[#2A1E5C]'}`}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  Profile
                </Link>
                <Link
                  to="/history"
                  onClick={() => setIsOpen(false)}
                  className={`font-display font-medium py-2 ${isActive('/history') ? 'text-[#7B61FF] font-bold' : 'text-[#2A1E5C]'}`}
                >
                  <HistoryIcon className="w-4 h-4 inline mr-2" />
                  History
                </Link>

                {isAuthenticated && user ? (
                  <>
                    <div className="border-t border-[#ECE9FF] my-2" />
                    <div className="flex items-center gap-2 py-2">
                      <img
                        src="/crossy-small.png"
                        alt="Crossy"
                        className="w-5 h-5"
                      />
                      <div className="w-7 h-7 rounded-full bg-[#7B61FF] flex items-center justify-center text-white font-display font-bold text-sm">
                        {(user.displayName || 'G')[0].toUpperCase()}
                      </div>
                      <span className="font-display font-medium text-sm text-[#2A1E5C]">
                        {user.displayName || 'Guest'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="font-display font-medium text-destructive py-2 text-left"
                    >
                      <LogOut className="w-4 h-4 inline mr-2" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Button
                    onClick={handleLoginClick}
                    className="crossy-button w-full mt-2"
                  >
                    Login
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
