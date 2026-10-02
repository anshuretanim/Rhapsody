import "./Navbar.css";
import { Link } from "react-router-dom";
import logo from "../assets/Rhapsody Signal Navbar.png";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="logo">
        <img src={logo} alt="Rhapsody logo" />
      </div>
      <ul className="link-names">
        <li>
          
            <Link to="/about"> About The Project</Link>
          
        </li>
      </ul>
    </nav>
  );
}

export default Navbar;
