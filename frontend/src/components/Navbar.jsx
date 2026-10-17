
import "./Navbar.css";
import { Link } from "react-router-dom";
import logo from "../assets/LogoRhapsody.png";

function Navbar() {
    return (
        <nav className="navbar">
            <Link to="/" className="logo" aria-label="Rhapsody home">
                <img src={logo} alt="Rhapsody" />
            </Link>

            <ul className="link-names">
                

                <li>
                    <Link to="/about" className="nav-link">
                        About the project
                        <span className="nav-arrow">↗</span>
                    </Link>
                </li>
            </ul>
        </nav>
    );
}

export default Navbar;
