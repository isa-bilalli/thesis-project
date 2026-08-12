import { Link } from "react-router-dom";

export function Navbar() {
    return(
      <>
        <div className="hidden w-64 shrink-0 lg:block" aria-hidden="true" />
        <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-64 flex-col overflow-y-auto border-r border-zinc-800 bg-zinc-950 text-zinc-300 lg:flex">
            <div className="flex h-16 items-center px-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-black">D</div>
                    <div>
                        <h1 className="text-sm font-semibold text-white">DriveFlow {/*CLIENT NAME */}</h1>
                        <p className="text-xs text-zinc-500">Dealership OS</p>
                    </div>
                </div>
            </div>
            <div className="px-3 py-3">
                <button className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 transition hover:bg-zinc-900">
                    <div className="text-left">
                        <p className="text-xs text-zinc-500">Dealership</p>
                        <p className="text-sm font-medium text-white">Bilalli Motors {/*Dealership name */}</p>
                    </div>
                </button>
            </div>
      {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Workspace</p>
                <div className="flex flex-col mx-2 text-center space-y-2">
                    <Link to={"/dashboard"} className="bg-zinc-900/60 hover:bg-zinc-900 transition border-zinc-800 border text-white font-medium p-3 rounded-xl">Dashboard</Link>
                    <Link to={"/dashboard"} className="bg-zinc-900/60 hover:bg-zinc-900 transition border-zinc-800 border text-white font-medium p-3 rounded-xl">Inventory</Link>
                    <Link to={"/dashboard"} className="bg-zinc-900/60 hover:bg-zinc-900 transition border-zinc-800 border text-white font-medium p-3 rounded-xl">Customers</Link>
                    <Link to={"/dashboard"} className="bg-zinc-900/60 hover:bg-zinc-900 transition border-zinc-800 border text-white font-medium p-3 rounded-xl">Leads</Link>
                    <Link to={"/dashboard"} className="bg-zinc-900/60 hover:bg-zinc-900 transition border-zinc-800 border text-white font-medium p-3 rounded-xl">Test Drives</Link>
                    <Link to={"/dashboard"} className="bg-zinc-900/60 hover:bg-zinc-900 transition border-zinc-800 border text-white font-medium p-3 rounded-xl">Sales</Link>
                    <Link to={"/dashboard"} className="bg-zinc-900/60 hover:bg-zinc-900 transition border-zinc-800 border text-white font-medium p-3 rounded-xl">Reservation</Link>
                    <Link to={"/dashboard"} className="bg-zinc-900/60 hover:bg-zinc-900 transition border-zinc-800 border text-white font-medium p-3 rounded-xl">Dealership Admin</Link>
                </div>
            </nav>
      {/* User */}
            <div className="px-3 pb-4">
                <div className="flex items-center gap-3 rounded-xl bg-zinc-900/70 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">IB {/* User initials */}</div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">Isa Bilalli {/* Username */}</p>
                        <p className="truncate text-xs text-zinc-500">Administrator {/*USER ROLE */}</p>
                    </div>
                    <button className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white">{/**SETTINGS LOGO */}</button>
                    <button className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-white">{/**LOGOUT LOGO */}</button>
                </div>
            </div>
        </aside>
      </>
    )
}

export default Navbar;
