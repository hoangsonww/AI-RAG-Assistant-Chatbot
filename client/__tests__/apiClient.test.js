/*  apiClient smoke-tests
    ▸ token helpers
    ▸ axios interceptor attaches Authorization
    ▸ validateToken happy-/sad-paths
*/
jest.useFakeTimers();

/* polyfill localStorage for Node */
global.localStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (k, v) => {
      store[k] = v;
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();

/* --- mock axios ------------------------------------------------------------ */
const handlers = {};
const axiosInstance = {
  interceptors: {
    request: {
      use: (fn) => {
        handlers.onReq = fn;
      },
    },
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};
jest.mock("axios", () => ({
  create: jest.fn(() => axiosInstance),
  __handlers: handlers,
}));

/* import module _after_ mocks */
const api = require("../../utils/api"); // adjust path if different
const {
  setTokenInLocalStorage,
  getTokenFromLocalStorage,
  isAuthenticated,
  validateToken,
} = api;

/* --------------------------------------------------------------------------- */
describe("client-side api helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test("token helpers set/get/authenticate", () => {
    expect(isAuthenticated()).toBe(false);
    setTokenInLocalStorage("T123");
    expect(getTokenFromLocalStorage()).toBe("T123");
    expect(isAuthenticated()).toBe(true);
  });

  test("axios interceptor adds Authorization header", () => {
    setTokenInLocalStorage("XYZ");
    /* simulate axios firing request interceptor */
    const cfg = { headers: {} };
    handlers.onReq(cfg);
    expect(cfg.headers.Authorization).toBe("Bearer XYZ");
  });

  test("validateToken happy-path ⇒ true", async () => {
    setTokenInLocalStorage("GOOD");
    axiosInstance.get.mockResolvedValueOnce({
      status: 200,
      data: { valid: true },
    });

    const ok = await validateToken();
    expect(ok).toBe(true);
    expect(axiosInstance.get).toHaveBeenCalledWith(
      "/auth/validate-token",
      expect.objectContaining({ headers: { Authorization: "Bearer GOOD" } }),
    );
    expect(localStorage.getItem("token")).toBe("GOOD");
  });

  test("validateToken fails after retries and clears token", async () => {
    setTokenInLocalStorage("BAD");
    axiosInstance.get.mockRejectedValue(new Error("nope"));

    const p = validateToken(2); // 2 retries for speed
    jest.runAllTimers(); // skip setTimeout delays
    const ok = await p;

    expect(ok).toBe(false);
    expect(localStorage.getItem("token")).toBeNull();
    expect(axiosInstance.get).toHaveBeenCalledTimes(2);
  });
});
